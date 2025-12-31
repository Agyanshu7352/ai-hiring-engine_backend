const axios = require('axios');
const Resume = require('../models/Resume');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const FormData = require('form-data');

// @desc    Parse and upload resume
// @route   POST /api/parse-resume
// @access  Public/Private
exports.parseResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log('File uploaded:', req.file.filename);
    console.log('File path:', req.file.path);
    console.log('ML Service URL:', process.env.ML_SERVICE_URL);

    // Check if ML service URL is configured
    if (!process.env.ML_SERVICE_URL) {
      throw new Error('ML_SERVICE_URL is not configured');
    }

    // Verify file exists
    if (!fsSync.existsSync(req.file.path)) {
      throw new Error('Uploaded file not found');
    }

    const formData = new FormData();
    formData.append(
      'resume',
      fsSync.createReadStream(req.file.path),
      {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      }
    );

    console.log('Sending request to ML service...');

    const mlResponse = await axios.post(
      `${process.env.ML_SERVICE_URL}/parse-resume`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 60000, // Increased timeout to 60 seconds
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    console.log('ML service response received');

    // Validate ML response
    if (!mlResponse.data || !mlResponse.data.parsedData) {
      throw new Error('Invalid response from ML service');
    }

    // Save to database
    const resume = new Resume({
      userId: req.user?.id || null,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      extractedText: mlResponse.data.extractedText || '',
      parsedData: mlResponse.data.parsedData || {},
      status: 'parsed'
    });

    await resume.save();
    console.log('Resume saved to database with ID:', resume._id);

    res.status(200).json({
      success: true,
      resumeId: resume._id,
      data: {
        extractedText: mlResponse.data.extractedText,
        parsedData: mlResponse.data.parsedData
      }
    });
  } catch (error) {
    console.error('Resume parsing error:', error.message);
    console.error('Error stack:', error.stack);
    
    // More detailed error logging
    if (error.response) {
      console.error('ML Service error response:', {
        status: error.response.status,
        data: error.response.data
      });
    }

    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        if (fsSync.existsSync(req.file.path)) {
          await fs.unlink(req.file.path);
          console.log('Cleaned up uploaded file');
        }
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError.message);
      }
    }

    // Send appropriate error response
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.message || 'Failed to parse resume';

    res.status(statusCode).json({
      success: false,
      error: 'Failed to parse resume',
      details: errorMessage
    });
  }
};

// @desc    Get all resumes
// @route   GET /api/resumes
// @access  Private
exports.getResumes = async (req, res) => {
  try {
    const query = req.user ? { userId: req.user.id } : {};
    const resumes = await Resume.find(query)
      .sort({ createdAt: -1 })
      .select('-extractedText'); // Exclude large text field

    res.status(200).json({
      success: true,
      count: resumes.length,
      data: resumes
    });
  } catch (error) {
    console.error('Get resumes error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resumes',
      details: error.message
    });
  }
};

// @desc    Get single resume
// @route   GET /api/resumes/:id
// @access  Private
exports.getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    res.status(200).json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Get resume error:', error.message);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid resume ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch resume',
      details: error.message
    });
  }
};

// @desc    Delete resume
// @route   DELETE /api/resumes/:id
// @access  Private
exports.deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    // Check authorization (if user is authenticated)
    if (req.user && resume.userId && resume.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this resume'
      });
    }

    // Delete file from filesystem
    try {
      if (fsSync.existsSync(resume.filePath)) {
        await fs.unlink(resume.filePath);
        console.log('File deleted:', resume.filePath);
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError.message);
    }

    // Delete from database
    await resume.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Delete resume error:', error.message);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid resume ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete resume',
      details: error.message
    });
  }
};

// @desc    Update resume
// @route   PUT /api/resumes/:id
// @access  Private
exports.updateResume = async (req, res) => {
  try {
    const { tags, notes } = req.body;

    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    // Check authorization (if user is authenticated)
    if (req.user && resume.userId && resume.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this resume'
      });
    }

    if (tags !== undefined) resume.tags = tags;
    if (notes !== undefined) resume.notes = notes;

    await resume.save();

    res.status(200).json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Update resume error:', error.message);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid resume ID format'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update resume',
      details: error.message
    });
  }
};

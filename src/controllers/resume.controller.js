const axios = require('axios');
const Resume = require('../models/Resume');
const fs = require('fs').promises;
const path = require('path');

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
    
    // Get absolute path
    const absolutePath = path.resolve(req.file.path);
    console.log('Absolute file path:', absolutePath);

    // Send to ML service for parsing
    const mlResponse = await axios.post(
      `${process.env.ML_SERVICE_URL}/parse-resume`,
      {
        filePath: absolutePath,  // Use absolute path
        fileName: req.file.filename
      },
      {
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('ML service response received');

    // Save to database
    const resume = new Resume({
      userId: req.user?.id || null,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      extractedText: mlResponse.data.extractedText,
      parsedData: mlResponse.data.parsedData,
      status: 'parsed'
    });

    await resume.save();
    console.log('Resume saved to database');

    res.json({
      success: true,
      resumeId: resume._id,
      data: {
        extractedText: mlResponse.data.extractedText,
        parsedData: mlResponse.data.parsedData
      }
    });
  } catch (error) {
    console.error('Resume parsing error:', error.message);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to parse resume',
      details: error.message
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

    res.json({
      success: true,
      count: resumes.length,
      resumes
    });
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resumes'
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

    res.json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resume'
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

    // Delete file from filesystem
    try {
      await fs.unlink(resume.filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
    }

    // Delete from database
    await resume.deleteOne();

    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete resume'
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

    if (tags) resume.tags = tags;
    if (notes) resume.notes = notes;

    await resume.save();

    res.json({
      success: true,
      data: resume
    });
  } catch (error) {
    console.error('Update resume error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update resume'
    });
  }
};
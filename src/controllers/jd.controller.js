const axios = require('axios');
const JobDescription = require('../models/JobDescription');

// @desc    Parse and create job description
// @route   POST /api/parse-jd
// @access  Private
exports.parseJD = async (req, res) => {
  try {
    const { 
      title, 
      company, 
      description, 
      location, 
      department, 
      employmentType, 
      salaryRange,
      deadline 
    } = req.body;

    if (!title || !company || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title, company, and description are required'
      });
    }

    console.log('Parsing JD...');

    // Send to ML service for parsing
    const mlResponse = await axios.post(
      `${process.env.ML_SERVICE_URL}/parse-jd`,
      {
        title,
        company,
        description
      },
      {
        timeout: 30000
      }
    );

    console.log('ML service response received');

    // Save to database
    const jd = new JobDescription({
      userId: req.user?.id,
      title,
      company,
      description,
      location,
      department,
      employmentType,
      salaryRange,
      deadline,
      parsedData: mlResponse.data.parsedData
    });

    await jd.save();
    console.log('JD saved to database');

    res.json({
      success: true,
      jdId: jd._id,
      data: {
        parsedData: mlResponse.data.parsedData
      }
    });
  } catch (error) {
    console.error('JD parsing error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to parse job description',
      details: error.message
    });
  }
};

// @desc    Get all job descriptions
// @route   GET /api/job-descriptions
// @access  Private
exports.getJDs = async (req, res) => {
  try {
    const { status, search } = req.query;
    
    let query = {};
    if (req.user) {
      query.userId = req.user.id;
    }
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const jds = await JobDescription.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: jds.length,
      jobDescriptions: jds
    });
  } catch (error) {
    console.error('Get JDs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job descriptions'
    });
  }
};

// @desc    Get single job description
// @route   GET /api/job-descriptions/:id
// @access  Private
exports.getJDById = async (req, res) => {
  try {
    const jd = await JobDescription.findById(req.params.id);

    if (!jd) {
      return res.status(404).json({
        success: false,
        error: 'Job description not found'
      });
    }

    // Increment views
    jd.views += 1;
    await jd.save();

    res.json({
      success: true,
      data: jd
    });
  } catch (error) {
    console.error('Get JD error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job description'
    });
  }
};

// @desc    Update job description
// @route   PUT /api/job-descriptions/:id
// @access  Private
exports.updateJD = async (req, res) => {
  try {
    const jd = await JobDescription.findById(req.params.id);

    if (!jd) {
      return res.status(404).json({
        success: false,
        error: 'Job description not found'
      });
    }

    const updatedJD = await JobDescription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedJD
    });
  } catch (error) {
    console.error('Update JD error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job description'
    });
  }
};

// @desc    Delete job description
// @route   DELETE /api/job-descriptions/:id
// @access  Private
exports.deleteJD = async (req, res) => {
  try {
    const jd = await JobDescription.findById(req.params.id);

    if (!jd) {
      return res.status(404).json({
        success: false,
        error: 'Job description not found'
      });
    }

    await jd.deleteOne();

    res.json({
      success: true,
      message: 'Job description deleted successfully'
    });
  } catch (error) {
    console.error('Delete JD error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete job description'
    });
  }
};
const axios = require('axios');
const Resume = require('../models/Resume');
const JobDescription = require('../models/JobDescription');
const MatchResult = require('../models/MatchResult');

// @desc    Match resume with job description
// @route   POST /api/match
// @access  Private
exports.matchCandidates = async (req, res) => {
  try {
    const { resumeId, jobDescriptionId } = req.body;

    if (!resumeId || !jobDescriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Resume ID and Job Description ID are required'
      });
    }

    console.log('Fetching resume and JD...');

    // Fetch resume and job description
    const resume = await Resume.findById(resumeId);
    const jd = await JobDescription.findById(jobDescriptionId);

    if (!resume || !jd) {
      return res.status(404).json({
        success: false,
        error: 'Resume or Job Description not found'
      });
    }

    console.log('Calling ML service for matching...');

    // Send to ML service for matching
    const mlMatchResponse = await axios.post(
      `${process.env.ML_SERVICE_URL}/match`,
      {
        resume: resume.parsedData,
        jobDescription: jd.parsedData
      },
      { timeout: 30000 }
    );

    console.log('Getting gap analysis...');

    // Get gap analysis
    const gapResponse = await axios.post(
      `${process.env.ML_SERVICE_URL}/improve`,
      {
        resume: resume.parsedData,
        jobDescription: jd.parsedData,
        matchDetails: mlMatchResponse.data.matchDetails
      },
      { timeout: 30000 }
    );

    console.log('Generating interview questions...');

    // Get interview questions
    const interviewResponse = await axios.post(
      `${process.env.ML_SERVICE_URL}/interview`,
      {
        resume: resume.parsedData,
        jobDescription: jd.parsedData
      },
      { timeout: 30000 }
    );

    // Check if match already exists
    let matchResult = await MatchResult.findOne({
      resumeId,
      jobDescriptionId
    });

    if (matchResult) {
      // Update existing match
      matchResult.fitScore = mlMatchResponse.data.fitScore;
      matchResult.matchDetails = mlMatchResponse.data.matchDetails;
      matchResult.gapAnalysis = gapResponse.data;
      matchResult.interviewQuestions = interviewResponse.data.questions.map(q => ({
        question: typeof q === 'string' ? q : q.question,
        category: q.category || 'technical',
        difficulty: q.difficulty || 'medium'
      }));
    } else {
      // Create new match
      matchResult = new MatchResult({
        resumeId,
        jobDescriptionId,
        fitScore: mlMatchResponse.data.fitScore,
        matchDetails: mlMatchResponse.data.matchDetails,
        gapAnalysis: gapResponse.data,
        interviewQuestions: interviewResponse.data.questions.map(q => ({
          question: typeof q === 'string' ? q : q.question,
          category: q.category || 'technical',
          difficulty: q.difficulty || 'medium'
        }))
      });
    }

    await matchResult.save();

    // Update JD applicants count
    jd.applicants += 1;
    await jd.save();

    console.log('Match completed successfully');

    res.json({
      success: true,
      matchId: matchResult._id,
      data: {
        fitScore: matchResult.fitScore,
        matchDetails: matchResult.matchDetails,
        gapAnalysis: matchResult.gapAnalysis,
        interviewQuestions: matchResult.interviewQuestions
      }
    });
  } catch (error) {
    console.error('Match error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to match candidates',
      details: error.message
    });
  }
};

// @desc    Get all matches
// @route   GET /api/matches
// @access  Private
exports.getMatches = async (req, res) => {
  try {
    const { resumeId, jobDescriptionId, minScore, status } = req.query;
    
    let query = {};
    if (resumeId) query.resumeId = resumeId;
    if (jobDescriptionId) query.jobDescriptionId = jobDescriptionId;
    if (minScore) query.fitScore = { $gte: parseFloat(minScore) };
    if (status) query.status = status;

    const matches = await MatchResult.find(query)
      .populate('resumeId', 'fileName parsedData.name parsedData.email')
      .populate('jobDescriptionId', 'title company')
      .sort({ fitScore: -1, createdAt: -1 });

    res.json({
      success: true,
      count: matches.length,
      matches
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches'
    });
  }
};

// @desc    Get single match
// @route   GET /api/matches/:id
// @access  Private
exports.getMatchById = async (req, res) => {
  try {
    const match = await MatchResult.findById(req.params.id)
      .populate('resumeId')
      .populate('jobDescriptionId');

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match'
    });
  }
};

// @desc    Update match status
// @route   PUT /api/matches/:id
// @access  Private
exports.updateMatch = async (req, res) => {
  try {
    const { status, recruiterNotes, feedback } = req.body;

    const match = await MatchResult.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    if (status) match.status = status;
    if (recruiterNotes) match.recruiterNotes = recruiterNotes;
    if (feedback) match.feedback = feedback;

    await match.save();

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update match'
    });
  }
};

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private
exports.deleteMatch = async (req, res) => {
  try {
    const match = await MatchResult.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    await match.deleteOne();

    res.json({
      success: true,
      message: 'Match deleted successfully'
    });
  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete match'
    });
  }
};
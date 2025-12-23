const Resume = require('../models/Resume');
const JobDescription = require('../models/JobDescription');
const MatchResult = require('../models/MatchResult');

// @desc    Get dashboard analytics
// @route   GET /api/dashboard
// @access  Private
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;

    // Basic stats
    const totalResumes = await Resume.countDocuments(userId ? { userId } : {});
    const totalJDs = await JobDescription.countDocuments(userId ? { userId } : {});
    const totalMatches = await MatchResult.countDocuments();
    
    // Get active JDs
    const activeJDs = await JobDescription.countDocuments({
      ...(userId ? { userId } : {}),
      status: 'active'
    });

    // Recent matches
    const recentMatches = await MatchResult.find()
      .populate('resumeId', 'fileName parsedData.name parsedData.email parsedData.skills')
      .populate('jobDescriptionId', 'title company location')
      .sort({ createdAt: -1 })
      .limit(10);

    // Top candidates by fit score
    const topCandidates = await MatchResult.find()
      .populate('resumeId', 'fileName parsedData.name parsedData.email parsedData.skills')
      .populate('jobDescriptionId', 'title company')
      .sort({ fitScore: -1 })
      .limit(20);

    // Match status distribution
    const statusDistribution = await MatchResult.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Average fit scores
    const avgFitScore = await MatchResult.aggregate([
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$fitScore' },
          maxScore: { $max: '$fitScore' },
          minScore: { $min: '$fitScore' }
        }
      }
    ]);

    // Skills demand (top required skills across all JDs)
    const skillsDemand = await JobDescription.aggregate([
      { $unwind: '$parsedData.requiredSkills' },
      {
        $group: {
          _id: '$parsedData.requiredSkills',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Recent activity timeline
    const recentActivity = await MatchResult.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          avgScore: { $avg: '$fitScore' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ]);

    res.json({
      success: true,
      stats: {
        totalResumes,
        totalJDs,
        totalMatches,
        activeJDs
      },
      recentMatches,
      topCandidates,
      statusDistribution,
      avgFitScore: avgFitScore[0] || { avgScore: 0, maxScore: 0, minScore: 0 },
      skillsDemand,
      recentActivity
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error.message
    });
  }
};

// @desc    Get analytics for specific job
// @route   GET /api/dashboard/job/:id
// @access  Private
exports.getJobAnalytics = async (req, res) => {
  try {
    const jobId = req.params.id;

    const job = await JobDescription.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job description not found'
      });
    }

    // Get all matches for this job
    const matches = await MatchResult.find({ jobDescriptionId: jobId })
      .populate('resumeId', 'fileName parsedData.name parsedData.skills')
      .sort({ fitScore: -1 });

    // Calculate statistics
    const totalApplicants = matches.length;
    const avgFitScore = matches.reduce((sum, m) => sum + m.fitScore, 0) / totalApplicants || 0;
    
    const scoreDistribution = {
      excellent: matches.filter(m => m.fitScore >= 80).length,
      good: matches.filter(m => m.fitScore >= 60 && m.fitScore < 80).length,
      fair: matches.filter(m => m.fitScore >= 40 && m.fitScore < 60).length,
      poor: matches.filter(m => m.fitScore < 40).length
    };

    res.json({
      success: true,
      job,
      analytics: {
        totalApplicants,
        avgFitScore: avgFitScore.toFixed(2),
        scoreDistribution,
        matches
      }
    });
  } catch (error) {
    console.error('Job analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job analytics'
    });
  }
};
const mongoose = require('mongoose');

const matchResultSchema = new mongoose.Schema({
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true,
    index: true
  },
  jobDescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobDescription',
    required: true,
    index: true
  },
  fitScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  matchDetails: {
    matchedSkills: [String],
    missingSkills: [String],
    skillOverlap: {
      type: Number,
      min: 0,
      max: 100
    },
    experienceMatch: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Partial']
    },
    seniorityMatch: Boolean,
    matchBreakdown: {
      skillScore: Number,
      experienceScore: Number,
      educationScore: Number,
      overallScore: Number
    }
  },
  gapAnalysis: {
    recommendations: [String],
    improvementAreas: [String],
    learningPath: [String],
    estimatedTimeToReady: String
  },
  interviewQuestions: [{
    question: String,
    category: {
      type: String,
      enum: ['technical', 'behavioral', 'situational', 'role-specific']
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    }
  }],
  recruiterNotes: String,
  status: {
    type: String,
    enum: ['new', 'reviewed', 'shortlisted', 'rejected', 'interviewed', 'offered'],
    default: 'new'
  },
  ranking: Number,
  feedback: {
    recruiterRating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique resume-JD pairs
matchResultSchema.index({ resumeId: 1, jobDescriptionId: 1 }, { unique: true });
matchResultSchema.index({ fitScore: -1 });
matchResultSchema.index({ status: 1 });

matchResultSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MatchResult', matchResultSchema);
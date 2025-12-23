const mongoose = require('mongoose');

const jobDescriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
    default: 'Full-time'
  },
  salaryRange: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  description: {
    type: String,
    required: [true, 'Job description is required']
  },
  parsedData: {
    requiredSkills: [String],
    optionalSkills: [String],
    keywords: [String],
    seniority: {
      type: String,
      enum: ['Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal']
    },
    experience: String,
    responsibilities: [String],
    qualifications: [String],
    benefits: [String]
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'on-hold'],
    default: 'active'
  },
  applicants: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  tags: [String],
  deadline: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

jobDescriptionSchema.index({ title: 'text', company: 'text' });
jobDescriptionSchema.index({ 'parsedData.requiredSkills': 1 });

jobDescriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('JobDescription', jobDescriptionSchema);
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const mongoose_1 = require("mongoose");
const TaskSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    userStory: { type: String, required: true },
    description: { type: String, required: true },
    acceptanceCriteria: [{ type: String }],
    status: {
        type: String,
        enum: ['todo', 'in_progress', 'review', 'done'],
        default: 'todo'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    storyPoints: { type: Number, default: 1 },
    assignee: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });
const ProjectSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    goal: { type: String, required: true },
    tasks: [TaskSchema],
    userId: { type: String, required: true },
    teamMembers: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});
exports.Project = (0, mongoose_1.model)('Project', ProjectSchema);

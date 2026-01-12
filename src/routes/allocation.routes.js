const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { AuthorAllocation } = require('../models');
const ApiResponse = require('../utils/apiResponse');

router.post('/', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    const { edition_id, author_id, brand_id } = req.body;
    const allocation = await AuthorAllocation.create({
      brand_id,
      edition_id,
      author_id,
      assigned_by: req.user.userId,
      status: 'active',
    });
    return ApiResponse.success(res, allocation, 'Author allocated successfully', 201);
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { editionId } = req.query;
    const query = editionId ? { edition_id: editionId } : {};
    const allocations = await AuthorAllocation.find(query)
      .populate('author_id')
      .populate('edition_id')
      .populate('assigned_by')
      .lean();
    return ApiResponse.success(res, allocations);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    const allocation = await AuthorAllocation.findByIdAndUpdate(
      req.params.id,
      { status: 'revoked' },
      { new: true }
    );
    if (!allocation) {
      return ApiResponse.notFound(res, 'Allocation not found');
    }
    return ApiResponse.success(res, allocation, 'Allocation revoked');
  } catch (error) {
    next(error);
  }
});

module.exports = router;

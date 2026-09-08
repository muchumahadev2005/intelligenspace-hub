export function paginate(query, page = 1, limit = 20) {
  const offset = (Math.max(1, page) - 1) * limit;
  return { limit, offset };
}

export function paginatedResponse(rows, total, page, limit) {
  return {
    data: rows,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
}

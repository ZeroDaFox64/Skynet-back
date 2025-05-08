const paginate = async (Model, query = {}, options = {}) => {
  const {
    page = 1, // Página actual (por defecto: 1)
    limit = 20, // Límite de documentos por página (por defecto: 10)
    sortBy, // Campo para ordenar (opcional)
    sortOrder = "asc", // Orden de clasificación (asc o desc, por defecto: asc)
    populate = [], // Relaciones a poblar (opcional, puede ser un string o un array)
  } = options;

  // Convertir página y límite a números
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  // Validar que los valores de paginación sean válidos
  if (
    isNaN(pageNumber) ||
    isNaN(limitNumber) ||
    pageNumber < 1 ||
    limitNumber < 1
  ) {
    throw new Error("Parámetros de paginación no válidos.");
  }

  // Crear objeto de opciones para la consulta
  const paginationOptions = {
    page: pageNumber,
    limit: limitNumber,
    sort: sortBy ? { [sortBy]: sortOrder === "asc" ? 1 : -1 } : null, // Ordenar si se especifica sortBy
    populate, // Poblar relaciones si se especifican
  };

  // Realizar la consulta con paginación
  const result = await Model.paginate(query, paginationOptions);

  return result;
};

module.exports = {
  paginate,
};

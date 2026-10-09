export const toFormModel = (faculty = {}) => ({
  firstName: faculty.firstName ?? "",
  lastName: faculty.lastName ?? "",
  department: faculty.department ?? "",
});

export const toPayload = (form) => ({
  firstName: form.firstName.trim(),
  lastName: form.lastName.trim(),
  department: form.department.trim(),
});

export const facultyMatchesQuery = (faculty, query) => {
  if (!query) return true;

  const fieldsToSearch = [
    faculty.firstName,
    faculty.lastName,
    faculty.department,
  ]
    .join(" ")
    .toLowerCase();

  return query
    .trim()
    .toLowerCase()
    .split(" ")
    .every((word) => fieldsToSearch.includes(word));
};
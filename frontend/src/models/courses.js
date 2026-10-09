export const DEPARTMENTS = ["Computer Science", "Engineering", "English", "Business", "Art"];
export const FREQUENCIES = ["Yearly", "Even Years", "Odd Years"];
export const SEMESTERS = ["Fall", "Winter", "Spring", "Summer"];

export const toFormModel = (course = {}) => ({
  name: course.name ?? "",
  number: course.number ?? "",
  description: course.description ?? "",
  semesters: course.semesters ?? [],
  frequency: course.frequency ?? "",
  hours: course.hours ?? 3,
  department: course.department ?? "",
  sections: course.sections ?? [],
});

export const toPayload = (form) => ({
  name: form.name.trim(),
  number: form.number.trim(),
  hours: Number(form.hours),
  department: form.department.trim(),
  semesters: Array.isArray(form.semesters) ? form.semesters : [],
  frequency: form.frequency.trim(),
  description: form.description.trim(),
});

export const courseMatchesQuery = (course, query) => {
  if (!query) return true;

  const fieldsToSearch = [
    course.name,
    course.number,
    course.department,
    course.description,
    ...(course.semesters ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return query
    .trim()
    .toLowerCase()
    .split(" ")
    .every((word) => fieldsToSearch.includes(word));
};

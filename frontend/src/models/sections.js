
export const toSectionList = (section = {}) => ({
  sectionNumber: section.sectionNumber ?? "",
  semesterId: section.semesterId ?? "",
  facultyId: section.facultyId ?? "",
  courseId: section.courseId ?? "",
  daysOfWeek: section.daysOfWeek ?? "",
  startTime: section.startTime ?? "",
  endTime: section.endTime ?? "",
});

export const toSectionUpdate = (form) => ({
  sectionNumber: form.sectionNumber.trim(),
  semesterId: form.semesterId,
  facultyId: form.facultyId,
  courseId: form.courseId,
  daysOfWeek: form.daysOfWeek.trim(),
  startTime: form.startTime.trim(),
  endTime: form.endTime.trim(),
});

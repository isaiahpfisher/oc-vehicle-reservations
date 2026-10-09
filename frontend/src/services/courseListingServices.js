import apiClient from "./services.js";

const courseListingTestData = ([
    {
      enrollmentId: 1,
      sectionId: 'CMSC-1203-01',
      courseName: 'Programming I',
      creditHours: '3.00',
      frequency: 'MWF',
      startTime: '9:00 am',
      endTime: '9:50 am',
    },
    {
      enrollmentId: 2,
      sectionId: 'CMSC-1243-01',
      courseName: 'Software Engineering I',
      creditHours: '3.00',
      frequency: 'TTH',
      startTime: '1:10 pm',
      endTime: '2:30 pm',
    }
  ]);

const courseListingServices = {
    getCourseListingsTest(semesterId) {
        return Promise.resolve({ data: courseListingTestData });
    },

    getCourseListings(semesterId) {
      return apiClient.get(`course-listings/${semesterId}`);
    },

    removeEnrollment(enrollmentId) {
      return apiClient.delete(`course-listings/${enrollmentId}`);
    }
};

export default courseListingServices;
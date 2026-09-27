// Realistic shapes taken from Meta "Download Your Information" JSON exports.
export const fbProfile = {
  profile_v2: {
    name: { full_name: "FranÃ§ois MÃ¼ller" },
    birthday: { year: 1971, month: 3, day: 14 },
    education_experiences: [
      { name: "TU MÃ¼nchen", start_timestamp: 620000000, school_type: "College" },
    ],
    work_experiences: [
      { employer: "BMW Group", title: "Engineer", start_timestamp: 1046476800 },
    ],
    places_lived: [{ place: "Budapest", start_timestamp: 1400000000 }],
  },
};
export const fbPosts = [
  { timestamp: 1268568000, data: [{ post: "Moved into the new flat today. Boxes everywhere." }], title: "Frank updated his status." },
  { timestamp: 1400000000, title: "Frank updated his cover photo." },
  { timestamp: 1500000000, attachments: [{ data: [{ media: { uri: "x.jpg", creation_timestamp: 1500000000, title: "Sunrise over the Danube" } }] }], data: [] },
];
export const igPosts = [
  { media: [{ uri: "a.jpg", creation_timestamp: 1600000000, title: "First day at the new job Ã©" }], creation_timestamp: 1600000000 },
];
export const igProfile = {
  profile_user: [{ string_map_data: { Name: { value: "Frank" }, "Date of birth": { value: "1971-03-14" } } }],
};

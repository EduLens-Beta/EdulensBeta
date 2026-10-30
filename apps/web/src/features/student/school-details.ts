export const schoolClasses = [9, 10] as const;

export const studyGroups = [
  { value: "science", label: "Science" },
  { value: "business_studies", label: "Business Studies (Commerce)" },
  { value: "humanities", label: "Humanities" },
] as const;

export type SchoolClass = (typeof schoolClasses)[number];
export type StudyGroup = (typeof studyGroups)[number]["value"];

export type SchoolDetails = {
  school_class: SchoolClass;
  study_group: StudyGroup;
};

export function isSchoolClass(value: unknown): value is SchoolClass {
  return value === 9 || value === 10;
}

export function isStudyGroup(value: unknown): value is StudyGroup {
  return studyGroups.some((group) => group.value === value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSchoolDetails(value: unknown): value is SchoolDetails {
  return (
    isRecord(value) &&
    isSchoolClass(value.school_class) &&
    isStudyGroup(value.study_group)
  );
}

export function isEmptySchoolDetails(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.school_class === null &&
    value.study_group === null
  );
}

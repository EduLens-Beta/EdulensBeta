import { isEducationStage } from "@/features/student/education-stages";
import {
  isRecord,
  isSchoolClass,
  isStudyGroup,
} from "@/features/student/school-details";

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  education_stage: string | null;
  school_class: number | null;
  study_group: string | null;
};

export type AccountList = {
  accounts: AdminAccount[];
  total: number;
  limit: number;
  offset: number;
};

function isAccount(value: unknown): value is AdminAccount {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.is_active === "boolean" &&
    typeof value.is_admin === "boolean" &&
    typeof value.created_at === "string" &&
    Number.isFinite(Date.parse(value.created_at)) &&
    (value.education_stage === null ||
      isEducationStage(value.education_stage)) &&
    (value.school_class === null || isSchoolClass(value.school_class)) &&
    (value.study_group === null || isStudyGroup(value.study_group))
  );
}

export function readAccountList(value: unknown): AccountList | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.accounts) ||
    !value.accounts.every(isAccount) ||
    typeof value.total !== "number" ||
    !Number.isSafeInteger(value.total) ||
    value.total < 0 ||
    typeof value.limit !== "number" ||
    !Number.isSafeInteger(value.limit) ||
    value.limit < 1 ||
    value.limit > 100 ||
    typeof value.offset !== "number" ||
    !Number.isSafeInteger(value.offset) ||
    value.offset < 0 ||
    value.accounts.length > value.limit
  ) {
    return null;
  }

  return {
    accounts: value.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      email: account.email,
      is_active: account.is_active,
      is_admin: account.is_admin,
      created_at: account.created_at,
      education_stage: account.education_stage,
      school_class: account.school_class,
      study_group: account.study_group,
    })),
    total: value.total,
    limit: value.limit,
    offset: value.offset,
  };
}

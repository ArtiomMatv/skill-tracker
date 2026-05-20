/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type AssessmentsOrder =
  | 'DATE_ASC'
  | 'DATE_DESC';

export type BulkImportRowInput = {
  date: string;
  employeeId: number;
  notes?: string | null | undefined;
  score: number;
  skillId: number;
};

export type DashboardQueryVariables = Exact<{
  assessmentsLimit: number;
  assessmentsOffset: number;
  assessmentsOrder: AssessmentsOrder;
  filterEmployeeId?: number | null | undefined;
  filterSkillId?: number | null | undefined;
  filterScoreLt?: number | null | undefined;
}>;


export type DashboardQuery = { allData: { employees: Array<{ id: string, name: string }>, skills: Array<{ id: string, name: string }> }, matrixCells: Array<{ employeeId: number, skillId: number, average: number, count: number }>, assessments: { totalCount: number, items: Array<{ id: string, score: number, date: string, notes: string, employee: { id: string, name: string }, skill: { id: string, name: string } }> } };

export type AddAssessmentMutationVariables = Exact<{
  employeeId: number;
  skillId: number;
  score: number;
  date: string;
  notes?: string | null | undefined;
}>;


export type AddAssessmentMutation = { addAssessment: { ok: boolean, error: string | null, assessment: { id: string, score: number, date: string, notes: string, employee: { id: string, name: string }, skill: { id: string, name: string } } | null } | null };

export type UpdateAssessmentMutationVariables = Exact<{
  assessmentId: number;
  score: number;
  date: string;
  notes?: string | null | undefined;
}>;


export type UpdateAssessmentMutation = { updateAssessment: { ok: boolean, error: string | null, assessment: { id: string, score: number, date: string, notes: string, employee: { id: string, name: string }, skill: { id: string, name: string } } | null } | null };

export type AddEmployeeMutationVariables = Exact<{
  name: string;
}>;


export type AddEmployeeMutation = { addEmployee: { ok: boolean, error: string | null, employee: { id: string, name: string } | null } | null };

export type AddSkillMutationVariables = Exact<{
  name: string;
}>;


export type AddSkillMutation = { addSkill: { ok: boolean, error: string | null, skill: { id: string, name: string } | null } | null };

export type DeleteAssessmentMutationVariables = Exact<{
  assessmentId: number;
}>;


export type DeleteAssessmentMutation = { deleteAssessment: { ok: boolean, error: string | null } | null };

export type RestoreAssessmentMutationVariables = Exact<{
  assessmentId: number;
}>;


export type RestoreAssessmentMutation = { restoreAssessment: { ok: boolean, error: string | null } | null };

export type FinalizeDeleteAssessmentMutationVariables = Exact<{
  assessmentId: number;
}>;


export type FinalizeDeleteAssessmentMutation = { finalizeDeleteAssessment: { ok: boolean, error: string | null } | null };

export type BulkImportAssessmentsMutationVariables = Exact<{
  rows: Array<BulkImportRowInput> | BulkImportRowInput;
}>;


export type BulkImportAssessmentsMutation = { bulkImportAssessments: { ok: boolean, createdCount: number, error: string | null } | null };

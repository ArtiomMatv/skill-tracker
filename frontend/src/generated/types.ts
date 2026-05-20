export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * The `Date` scalar type represents a Date
   * value as specified by
   * [iso8601](https://en.wikipedia.org/wiki/ISO_8601).
   */
  Date: { input: string; output: string; }
};

export type AddAssessment = {
  __typename?: 'AddAssessment';
  assessment?: Maybe<AssessmentType>;
  error?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

export type AddEmployee = {
  __typename?: 'AddEmployee';
  employee?: Maybe<EmployeeType>;
  error?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

export type AddSkill = {
  __typename?: 'AddSkill';
  error?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
  skill?: Maybe<SkillType>;
};

export type AllDataType = {
  __typename?: 'AllDataType';
  employees: Array<EmployeeType>;
  skills: Array<SkillType>;
};

export type AssessmentType = {
  __typename?: 'AssessmentType';
  date: Scalars['Date']['output'];
  employee: EmployeeType;
  id: Scalars['ID']['output'];
  notes: Scalars['String']['output'];
  score: Scalars['Int']['output'];
  skill: SkillType;
};

export type AssessmentsOrder =
  | 'DATE_ASC'
  | 'DATE_DESC';

export type AssessmentsPageType = {
  __typename?: 'AssessmentsPageType';
  items: Array<AssessmentType>;
  totalCount: Scalars['Int']['output'];
};

/** Insert many assessments from parsed rows (strict: employee and skill must exist by id). */
export type BulkImportAssessments = {
  __typename?: 'BulkImportAssessments';
  createdCount: Scalars['Int']['output'];
  error?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

export type BulkImportRowInput = {
  date: Scalars['Date']['input'];
  employeeId: Scalars['Int']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  score: Scalars['Int']['input'];
  skillId: Scalars['Int']['input'];
};

export type DeleteAssessment = {
  __typename?: 'DeleteAssessment';
  error?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

export type EmployeeType = {
  __typename?: 'EmployeeType';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type FinalizeDeleteAssessment = {
  __typename?: 'FinalizeDeleteAssessment';
  error?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

export type MatrixCellType = {
  __typename?: 'MatrixCellType';
  average: Scalars['Float']['output'];
  count: Scalars['Int']['output'];
  employeeId: Scalars['Int']['output'];
  skillId: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addAssessment?: Maybe<AddAssessment>;
  addEmployee?: Maybe<AddEmployee>;
  addSkill?: Maybe<AddSkill>;
  /** Insert many assessments from parsed rows (strict: employee and skill must exist by id). */
  bulkImportAssessments?: Maybe<BulkImportAssessments>;
  deleteAssessment?: Maybe<DeleteAssessment>;
  finalizeDeleteAssessment?: Maybe<FinalizeDeleteAssessment>;
  restoreAssessment?: Maybe<RestoreAssessment>;
  updateAssessment?: Maybe<UpdateAssessment>;
};


export type MutationAddAssessmentArgs = {
  date: Scalars['Date']['input'];
  employeeId: Scalars['Int']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  score: Scalars['Int']['input'];
  skillId: Scalars['Int']['input'];
};


export type MutationAddEmployeeArgs = {
  name: Scalars['String']['input'];
};


export type MutationAddSkillArgs = {
  name: Scalars['String']['input'];
};


export type MutationBulkImportAssessmentsArgs = {
  rows: Array<BulkImportRowInput>;
};


export type MutationDeleteAssessmentArgs = {
  assessmentId: Scalars['Int']['input'];
};


export type MutationFinalizeDeleteAssessmentArgs = {
  assessmentId: Scalars['Int']['input'];
};


export type MutationRestoreAssessmentArgs = {
  assessmentId: Scalars['Int']['input'];
};


export type MutationUpdateAssessmentArgs = {
  assessmentId: Scalars['Int']['input'];
  date: Scalars['Date']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  score: Scalars['Int']['input'];
};

export type Query = {
  __typename?: 'Query';
  allData: AllDataType;
  assessments: AssessmentsPageType;
  matrixCells: Array<MatrixCellType>;
};


export type QueryAssessmentsArgs = {
  employeeId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<AssessmentsOrder>;
  scoreLt?: InputMaybe<Scalars['Int']['input']>;
  skillId?: InputMaybe<Scalars['Int']['input']>;
};

export type RestoreAssessment = {
  __typename?: 'RestoreAssessment';
  error?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

export type SkillType = {
  __typename?: 'SkillType';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type UpdateAssessment = {
  __typename?: 'UpdateAssessment';
  assessment?: Maybe<AssessmentType>;
  error?: Maybe<Scalars['String']['output']>;
  ok: Scalars['Boolean']['output'];
};

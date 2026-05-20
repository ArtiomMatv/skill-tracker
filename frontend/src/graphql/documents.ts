import { gql } from '@apollo/client'

/** GraphQL documents used by ``App.tsx`` (and tests). */

export const DASHBOARD = gql`
  query Dashboard(
    $assessmentsLimit: Int!
    $assessmentsOffset: Int!
    $assessmentsOrder: AssessmentsOrder!
    $filterEmployeeId: Int
    $filterSkillId: Int
    $filterScoreLt: Int
  ) {
    allData {
      employees {
        id
        name
      }
      skills {
        id
        name
      }
    }
    matrixCells {
      employeeId
      skillId
      average
      count
    }
    assessments(
      limit: $assessmentsLimit
      offset: $assessmentsOffset
      order: $assessmentsOrder
      employeeId: $filterEmployeeId
      skillId: $filterSkillId
      scoreLt: $filterScoreLt
    ) {
      totalCount
      items {
        id
        score
        date
        notes
        employee {
          id
          name
        }
        skill {
          id
          name
        }
      }
    }
  }
`

export const ADD_ASSESSMENT = gql`
  mutation AddAssessment(
    $employeeId: Int!
    $skillId: Int!
    $score: Int!
    $date: Date!
    $notes: String
  ) {
    addAssessment(
      employeeId: $employeeId
      skillId: $skillId
      score: $score
      date: $date
      notes: $notes
    ) {
      ok
      error
      assessment {
        id
        score
        date
        notes
        employee {
          id
          name
        }
        skill {
          id
          name
        }
      }
    }
  }
`

export const UPDATE_ASSESSMENT = gql`
  mutation UpdateAssessment(
    $assessmentId: Int!
    $score: Int!
    $date: Date!
    $notes: String
  ) {
    updateAssessment(
      assessmentId: $assessmentId
      score: $score
      date: $date
      notes: $notes
    ) {
      ok
      error
      assessment {
        id
        score
        date
        notes
        employee {
          id
          name
        }
        skill {
          id
          name
        }
      }
    }
  }
`

export const ADD_EMPLOYEE = gql`
  mutation AddEmployee($name: String!) {
    addEmployee(name: $name) {
      ok
      error
      employee {
        id
        name
      }
    }
  }
`

export const ADD_SKILL = gql`
  mutation AddSkill($name: String!) {
    addSkill(name: $name) {
      ok
      error
      skill {
        id
        name
      }
    }
  }
`

export const DELETE_ASSESSMENT = gql`
  mutation DeleteAssessment($assessmentId: Int!) {
    deleteAssessment(assessmentId: $assessmentId) {
      ok
      error
    }
  }
`

export const RESTORE_ASSESSMENT = gql`
  mutation RestoreAssessment($assessmentId: Int!) {
    restoreAssessment(assessmentId: $assessmentId) {
      ok
      error
    }
  }
`

export const FINALIZE_DELETE_ASSESSMENT = gql`
  mutation FinalizeDeleteAssessment($assessmentId: Int!) {
    finalizeDeleteAssessment(assessmentId: $assessmentId) {
      ok
      error
    }
  }
`

export const BULK_IMPORT_ASSESSMENTS = gql`
  mutation BulkImportAssessments($rows: [BulkImportRowInput!]!) {
    bulkImportAssessments(rows: $rows) {
      ok
      createdCount
      error
    }
  }
`

import { gql } from '@apollo/client'

/** GraphQL documents used by ``App.tsx`` (and tests). */

export const ALL_DATA = gql`
  query AllData {
    allData {
      employees {
        id
        name
      }
      skills {
        id
        name
      }
      assessments {
        id
        score
        date
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
  ) {
    addAssessment(
      employeeId: $employeeId
      skillId: $skillId
      score: $score
      date: $date
    ) {
      ok
      error
      assessment {
        id
        score
        date
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

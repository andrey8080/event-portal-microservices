export enum QuestionType {
    TEXT_ANSWER = 'TEXT',
    SINGLE_CHOICE = 'SINGLE_CHOICE',
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE'
}

export interface QuizAnswer {
    id: number;
    questionId: number;
    text: string;
    isCorrect?: boolean;
    order?: number;
}

export interface Answer {
    id?: number;
    text: string;
    isCorrect?: boolean;
}

export interface Question {
    id?: number;
    quizId?: number;
    text: string;
    type: QuestionType;
    correctAnswer: string;
    possibleAnswers: string[];
    points: number; // Добавлено поле points
    options?: any[];
    createdAt?: Date;
    updatedAt?: Date;
    answers?: Answer[];
}

export interface Quiz {
    id: number;
    eventId?: number;
    description: string;
    timeToPass: number; // время на прохождение в минутах
    createdAt?: Date;
    updatedAt?: Date;
    questions?: Question[]; // Добавляем опциональное свойство questions
    title?: string; // Добавляем отсутствующие поля
    timeLimit?: number;
    passScore?: number;
}

export interface QuizQuestion {
    id: number;
    quizId: number;
    text: string;
    type: QuestionType;
    answers: QuizAnswer[];
    points: number;
    order: number;
}

export interface QuizResult {
    id: number;
    quizId: number;
    userId: number;
    userName: string;
    userEmail?: string;
    score?: number;
    result: number;
    maxScore?: number;
    percentageScore?: number;
    startTime: Date;
    endTime?: Date;
    duration?: number; // в секундах
    passed?: boolean;
    createdAt?: Date;
}

export interface UserAnswer {
    questionId: number;
    answerId?: number; // Для вопросов с выбором варианта
    textAnswer?: string; // Для текстовых вопросов
}

export interface QuizSubmission {
    id?: number;
    userId: number;
    quizId: number;
    eventId: number;
    startTime: Date;
    endTime?: Date;
    score?: number;
    maxScore?: number;
    answers: QuizSubmissionAnswer[];
}

export interface QuizSubmissionAnswer {
    questionId: number;
    selectedAnswerIds?: number[]; // Для выбора одного или нескольких вариантов
    textAnswer?: string; // Для текстового ответа
}
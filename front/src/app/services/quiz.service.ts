import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, of, from, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';
import { Quiz, Question, QuizAnswer, QuizResult } from '../models/quiz.model';
import { catchError, concatMap, map, switchMap, toArray } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private apiUrl = `${environment.apiUrl}/quizzes`;

  constructor(private http: HttpClient) { }

  // Quiz methods
  getQuizzes(eventId: number): Observable<Quiz[]> {
    return this.http.get<any[]>(`${this.apiUrl}`, { params: { eventId } as any }).pipe(
      map(items => (items ?? []).map(dto => this.mapQuizDto(dto))),
      catchError(err => throwError(() => err))
    );
  }

  getEventQuizzes(eventId: number): Observable<Quiz[]> {
    return this.getQuizzes(eventId);
  }

  getQuiz(quizId: number, eventId?: number): Observable<Quiz> {
    if (eventId == null) {
      return throwError(() => new Error('getQuiz requires eventId in current backend API'));
    }

    return this.getQuizzes(eventId).pipe(
      map(quizzes => {
        const quiz = quizzes.find(q => q.id === quizId);
        if (!quiz) {
          throw new Error('Quiz not found for provided eventId');
        }
        return quiz;
      })
    );
  }

  createQuiz(eventId: number, quizData: any): Observable<Quiz> {
    const body = {
      eventId,
      description: quizData?.description,
      timeToPass: quizData?.timeToPass
    };

    return this.http.post<any>(`${this.apiUrl}`, body).pipe(
      switchMap(() => this.getQuizzes(eventId)),
      map(quizzes => {
        const created = [...quizzes].sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
        if (!created) {
          throw new Error('Quiz created but cannot be retrieved');
        }
        return created;
      }),
      switchMap(createdQuiz => {
        const questions = Array.isArray(quizData?.questions) ? quizData.questions : [];
        if (questions.length === 0) {
          return of(createdQuiz);
        }

        return from(questions).pipe(
          concatMap((q: any) => this.addQuestion(createdQuiz.id, q)),
          toArray(),
          switchMap(() => this.getQuestions(createdQuiz.id)),
          switchMap(createdQuestions => {
            const byText = new Map<string, number[]>();
            createdQuestions.forEach(q => {
              if (!q.text || q.id == null) return;
              const list = byText.get(q.text) ?? [];
              list.push(q.id);
              byText.set(q.text, list);
            });

            // Создаём ответы (если есть) для каждого вопроса, сопоставляя по text.
            const answerOps: Observable<any>[] = [];
            for (const q of questions) {
              const text = q?.text;
              const ids = typeof text === 'string' ? (byText.get(text) ?? []) : [];
              const questionId = ids.shift();
              if (!questionId) continue;

              const answers = Array.isArray(q?.answers) ? q.answers : [];
              for (const a of answers) {
                answerOps.push(this.addAnswer(createdQuiz.id, questionId, a));
              }
            }

            if (answerOps.length === 0) {
              return of(createdQuiz);
            }

            return forkJoin(answerOps).pipe(map(() => createdQuiz));
          })
        );
      }),
      catchError(err => throwError(() => err))
    );
  }

  updateQuiz(quizId: number, quizData: any): Observable<Quiz> {
    void quizId;
    void quizData;
    return throwError(() => new Error('updateQuiz endpoint is not available in current backend API'));
  }

  deleteQuiz(quizId: number): Observable<void> {
    void quizId;
    return throwError(() => new Error('deleteQuiz endpoint is not available in current backend API'));
  }

  // Question methods
  getQuestions(quizId: number): Observable<Question[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${quizId}/questions`).pipe(
      map(items => (items ?? []).map(dto => this.mapQuestionDto(dto))),
      catchError(err => throwError(() => err))
    );
  }

  getQuizQuestions(quizId: number): Observable<Question[]> {
    return this.getQuestions(quizId);
  }

  getQuestionCorrectAnswer(questionId: number): Observable<string> {
    void questionId;
    return throwError(() => new Error('correct-answer endpoint is not available in current backend API'));
  }

  getQuestionAnswers(questionId: number, quizId?: number): Observable<QuizAnswer[]> {
    if (quizId == null) {
      return throwError(() => new Error('getQuestionAnswers requires quizId in current backend API'));
    }

    return this.http.get<any[]>(`${this.apiUrl}/${quizId}/questions/${questionId}/answers`).pipe(
      map(items => (items ?? []).map(dto => this.mapAnswerDto(dto, questionId))),
      catchError(err => throwError(() => err))
    );
  }

  // Answer methods
  submitAnswer(answer: QuizAnswer): Observable<QuizAnswer> {
    void answer;
    return throwError(() => new Error('participants answers submission is not supported in current backend API'));
  }

  // Quiz result methods
  submitQuizResult(result: QuizResult): Observable<QuizResult> {
    if (!result?.quizId) {
      return throwError(() => new Error('quizId is required to submit result'));
    }

    const score = typeof result.result === 'number' ? result.result : 0;
    return this.http.put<any>(`${this.apiUrl}/${result.quizId}/results/me`, null, { params: { result: score } as any }).pipe(
      map(() => result),
      catchError(err => throwError(() => err))
    );
  }

  getQuizResults(quizId: number): Observable<QuizResult[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${quizId}/results`).pipe(
      map(items => (items ?? []).map(dto => this.mapResultDto(dto, quizId))),
      catchError(err => throwError(() => err))
    );
  }

  getQuizResultsByEvent(eventId: number): Observable<QuizResult[]> {
    return this.getQuizzes(eventId).pipe(
      switchMap(quizzes => {
        if (!quizzes || quizzes.length === 0) return of([] as QuizResult[]);
        return forkJoin(quizzes.map(q => this.getQuizResults(q.id))).pipe(
          map(groups => groups.reduce((acc, cur) => acc.concat(cur), [] as QuizResult[]))
        );
      }),
      catchError(err => throwError(() => err))
    );
  }

  exportQuizResults(quizId: number): Observable<Blob> {
    void quizId;
    return throwError(() => new Error('exportQuizResults endpoint is not available in current backend API'));
  }

  addQuestion(quizId: number, questionData: any): Observable<any> {
    const body = {
      text: questionData?.text,
      type: questionData?.type
    };

    return this.http.post<any>(`${this.apiUrl}/${quizId}/questions`, body).pipe(
      catchError(err => throwError(() => err))
    );
  }

  addAnswer(quizId: number, questionId: number, answerData: any): Observable<any> {
    const body = {
      questionId,
      text: answerData?.text
    };

    return this.http.post<any>(`${this.apiUrl}/${quizId}/questions/${questionId}/answers`, body).pipe(
      catchError(err => throwError(() => err))
    );
  }

  private mapQuizDto(dto: any): Quiz {
    return {
      id: dto?.id ?? 0,
      eventId: dto?.eventId,
      description: dto?.description ?? '',
      timeToPass: dto?.timeToPass ?? 0
    };
  }

  private mapQuestionDto(dto: any): Question {
    return {
      id: dto?.id,
      quizId: dto?.quizId,
      text: dto?.text ?? '',
      type: dto?.type,
      correctAnswer: '',
      possibleAnswers: [],
      points: 0
    };
  }

  private mapAnswerDto(dto: any, questionId: number): QuizAnswer {
    return {
      id: dto?.id ?? 0,
      questionId,
      text: dto?.text ?? ''
    };
  }

  private mapResultDto(dto: any, quizId: number): QuizResult {
    return {
      id: dto?.id ?? 0,
      quizId,
      userId: 0,
      userName: dto?.name ?? '',
      userEmail: dto?.email,
      result: dto?.result ?? 0,
      startTime: new Date()
    };
  }
}
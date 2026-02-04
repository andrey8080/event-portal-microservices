import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizService } from '../../../services/quiz.service';
import { NotificationService } from '../../../services/notification.service';
import { Quiz, QuestionType } from '../../../models/quiz.model';

@Component({
    selector: 'app-quiz-create',
    templateUrl: './quiz-create.component.html',
    // styleUrls: ['./quiz-create.component.scss'],
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule]
})
export class QuizCreateComponent implements OnInit {
    quizForm: FormGroup;
    eventId: number = 0;
    isEditMode: boolean = false;
    quizId: number = 0;
    isLoading: boolean = false;
    isSaving: boolean = false;
    error: string | null = null;

    // Для доступа к типам вопросов в шаблоне
    QuestionType = QuestionType;
    questionTypes = [
        { value: QuestionType.SINGLE_CHOICE, label: 'Один ответ' },
        { value: QuestionType.MULTIPLE_CHOICE, label: 'Несколько ответов' },
        { value: QuestionType.TEXT_ANSWER, label: 'Текстовый ответ' }
    ];

    constructor(
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private quizService: QuizService,
        private notificationService: NotificationService
    ) {
        this.quizForm = this.fb.group({
            description: ['', [Validators.required, Validators.minLength(5)]],
            timeToPass: [15, [Validators.required, Validators.min(1), Validators.max(120)]],
            questions: this.fb.array([])
        });
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            this.eventId = +params['eventId'] || 0;
            this.quizId = +params['quizId'] || 0;
            this.isEditMode = !!this.quizId;

            if (this.isEditMode) {
                this.notificationService.error('Редактирование квиза пока не поддерживается текущим API');
                this.router.navigate(['/events', this.eventId]);
            }
        });
    }

    get questions(): FormArray {
        return this.quizForm.get('questions') as FormArray;
    }

    loadQuiz(): void {
        this.notificationService.error('Редактирование квиза пока не поддерживается текущим API');
    }

    addQuestion(): void {
        const questionGroup = this.fb.group({
            text: ['', [Validators.required]],
            type: [QuestionType.SINGLE_CHOICE, [Validators.required]],
            points: [1, [Validators.required, Validators.min(1)]],
            answers: this.fb.array([
                this.createAnswerGroup(),
                this.createAnswerGroup()
            ])
        });

        this.questions.push(questionGroup);
    }

    createAnswerGroup(text: string = '', isCorrect: boolean = false): FormGroup {
        return this.fb.group({
            text: [text, [Validators.required]],
            isCorrect: [isCorrect]
        });
    }

    getQuestionAnswers(questionIndex: number): FormArray {
        return (this.questions.at(questionIndex) as FormGroup).get('answers') as FormArray;
    }

    addAnswer(questionIndex: number): void {
        const answers = this.getQuestionAnswers(questionIndex);
        answers.push(this.createAnswerGroup());
    }

    removeAnswer(questionIndex: number, answerIndex: number): void {
        const answers = this.getQuestionAnswers(questionIndex);
        if (answers.length > 2) {
            answers.removeAt(answerIndex);
        } else {
            this.notificationService.error('Вопрос должен иметь как минимум два варианта ответа');
        }
    }

    removeQuestion(questionIndex: number): void {
        this.questions.removeAt(questionIndex);
    }

    onTypeChange(questionIndex: number): void {
        const question = this.questions.at(questionIndex) as FormGroup;
        const type = question.get('type')?.value;

        if (type === QuestionType.TEXT_ANSWER) {
            // Для текстовых вопросов очищаем варианты ответов
            const answers = this.getQuestionAnswers(questionIndex);
            while (answers.length) {
                answers.removeAt(0);
            }

            // Добавляем один текстовый ответ, который будет считаться правильным
            answers.push(this.fb.group({
                text: ['Правильный ответ', [Validators.required]],
                isCorrect: [true]
            }));
        } else {
            const answers = this.getQuestionAnswers(questionIndex);
            if (answers.length === 0) {
                // Если переключаемся с текстового на другой тип, добавляем два варианта
                const answers = this.getQuestionAnswers(questionIndex);
                answers.push(this.createAnswerGroup());
                answers.push(this.createAnswerGroup());
            }
        }
    }

    buildQuestionForm(question?: any): FormGroup {
        const questionForm = this.fb.group({
            id: [question?.id || null],
            text: [question?.text || '', Validators.required],
            type: [question?.type || QuestionType.SINGLE_CHOICE, Validators.required],
            correctAnswer: [question?.correctAnswer || '', Validators.required],
            points: [question?.points || 1, [Validators.required, Validators.min(1)]], // Добавлено по умолчанию
            answers: this.fb.array([])
        });

        const answersFormArray = questionForm.get('answers') as FormArray;

        // Добавим ответы
        if (question && question.possibleAnswers) {
            question.possibleAnswers.forEach((answer: string) => {
                answersFormArray.push(this.createAnswerGroup(answer, false));
            });
        } else {
            // По умолчанию добавляем 4 пустых варианта ответа
            for (let i = 0; i < 4; i++) {
                answersFormArray.push(this.createAnswerGroup());
            }
        }

        return questionForm;
    }

    onSubmit(): void {
        if (this.quizForm.invalid) {
            this.markFormGroupTouched(this.quizForm);
            this.notificationService.error('Пожалуйста, исправьте ошибки в форме');
            return;
        }

        // Валидация правильных ответов
        const formValid = this.validateQuizForm();
        if (!formValid) return;

        this.isSaving = true;

        const quizData: Partial<Quiz> = {
            ...this.quizForm.value,
            eventId: this.eventId
        };

        if (this.isEditMode) {
            this.isSaving = false;
            this.notificationService.error('Редактирование квиза пока не поддерживается текущим API');
            return;
        }

        this.quizService.createQuiz(this.eventId, quizData).subscribe({
            next: () => {
                this.isSaving = false;
                this.notificationService.success('Квиз успешно создан');
                this.router.navigate(['/events', this.eventId]);
            },
            error: (err) => {
                this.isSaving = false;
                this.error = 'Ошибка при создании квиза: ' + (err.error?.message || err.message);
                console.error('Error creating quiz:', err);
            }
        });
    }

    validateQuizForm(): boolean {
        let formValid = true;

        // Проверяем наличие как минимум одного вопроса
        if (this.questions.length === 0) {
            this.notificationService.error('Добавьте хотя бы один вопрос');
            return false;
        }

        // Проверяем каждый вопрос
        for (let i = 0; i < this.questions.length; i++) {
            const question = this.questions.at(i) as FormGroup;
            const type = question.get('type')?.value;
            const answers = question.get('answers') as FormArray;

            // Для вопросов с выбором должен быть хотя бы один правильный ответ
            if (type !== QuestionType.TEXT_ANSWER) {
                const hasCorrectAnswer = Array.from({ length: answers.length })
                    .some((_, j) => (answers.at(j) as FormGroup).get('isCorrect')?.value);

                if (!hasCorrectAnswer) {
                    this.notificationService.error(`В вопросе #${i + 1} нет правильного ответа`);
                    formValid = false;
                }
            }
        }

        return formValid;
    }

    markFormGroupTouched(formGroup: FormGroup): void {
        Object.keys(formGroup.controls).forEach(key => {
            const control = formGroup.get(key);
            if (control instanceof FormGroup) {
                this.markFormGroupTouched(control);
            } else if (control instanceof FormArray) {
                for (let i = 0; i < control.length; i++) {
                    if (control.at(i) instanceof FormGroup) {
                        this.markFormGroupTouched(control.at(i) as FormGroup);
                    }
                }
            } else {
                control?.markAsTouched();
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/events', this.eventId]);
    }
}

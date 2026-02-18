import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventService } from '../../../services/event.service';
import { Event } from '../../../models/event.model';
import { AddressInputComponent } from '../../shared/address-input/address-input.component';

@Component({
  selector: 'app-event-edit',
  templateUrl: './event-edit.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AddressInputComponent]
})
export class EventEditComponent implements OnInit {
  eventForm!: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  debugInfo: string = '';

  private currentEvent?: Event;

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.eventForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      price: [0, Validators.required],
      maxParticipants: [1, Validators.required],
      hasQuiz: [false],
      address: ['', Validators.required],
      latitude: ['', Validators.required],
      longitude: ['', Validators.required],
    });

    const eventId = +this.route.snapshot.paramMap.get('id')!;
    this.eventService.getEvent(eventId).subscribe({
      next: (data) => {
        this.currentEvent = data;
        this.eventForm.patchValue({
          title: data.title,
          description: data.description,
          price: data.price,
          maxParticipants: data.maxParticipants,
          hasQuiz: data.hasQuiz,
          address: data.location?.address ?? data.address ?? '',
          latitude: data.location?.latitude ?? '',
          longitude: data.location?.longitude ?? ''
        });
      },
      error: () => {
        this.errorMessage = 'Ошибка при загрузке данных события.';
      }
    });
  }

  onSubmit(): void {
    if (this.eventForm.invalid) return;
    this.isSubmitting = true;

    if (!this.currentEvent) {
      this.errorMessage = 'Событие ещё не загружено.';
      this.isSubmitting = false;
      return;
    }

    const formValues = this.eventForm.value;
    const lat = Number(formValues.latitude);
    const lng = Number(formValues.longitude);

    const updatedEvent: Event = {
      ...this.currentEvent,
      title: formValues.title,
      description: formValues.description,
      price: Number(formValues.price),
      maxParticipants: Number(formValues.maxParticipants),
      hasQuiz: !!formValues.hasQuiz,
      location: {
        address: (formValues.address || '').toString(),
        latitude: Number.isFinite(lat) ? lat : undefined,
        longitude: Number.isFinite(lng) ? lng : undefined,
      },
    };

    this.eventService.updateEvent(updatedEvent).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/events']);
      },
      error: () => {
        this.errorMessage = 'Ошибка при обновлении события.';
        this.isSubmitting = false;
      }
    });
  }
}


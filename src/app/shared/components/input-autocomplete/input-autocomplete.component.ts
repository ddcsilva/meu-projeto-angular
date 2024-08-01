import { coerceNumberProperty } from '@angular/cdk/coercion';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Optional,
  Output,
  Self,
  SimpleChanges
} from '@angular/core';
import {
  AbstractControl,
  UntypedFormControl,
  NgControl,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { InputAutoComplete } from '../../models/input-autocomplete-model';

// Valida se o valor passado possui um código para ser declarado como um
// objeto fornecido por opções de preenchimento automático de material
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function isAutocompleteOption(value: InputAutoComplete): boolean {
  if (value && typeof value === 'string') {
    return false;
  }

  if (!value) {
    return true;
  }

  return value.id !== null;
}

// Valida o valor do controle para ter um atributo `id`. É esperado
// valor de controle para ser um objeto.
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function containsIdValidation(control: AbstractControl): ValidationErrors {
  return isAutocompleteOption(control.value) ? null : { isAutocompleteInvalid: true };
}

@Component({
  selector: 'app-input-autocomplete',
  templateUrl: './input-autocomplete.component.html',
  styleUrls: ['./input-autocomplete.component.scss']
})
export class InputAutocompleteComponent implements OnInit, OnChanges {
  @Input() placeholder!: string;
  @Input() options!: InputAutoComplete[] | null;
  @Input() minLength: string;
  @Input() controlSelected: string;
  @Input() minWidth: string;
  @Input() largura: number;
  @Input() matErrorDefault: boolean;

  @Input()
  set lengthToTriggerSearch(value: string) {
    // eslint-disable-next-line no-underscore-dangle
    this._lengthToTriggerSearch = coerceNumberProperty(value, 0);
    this.minLength = value;
  }

  @Output() autoCompleteEvent = new EventEmitter<any>();

  // Controle de formulário para vincular alterações de entrada ao mat autocomplete
  inputControl = new UntypedFormControl('', this.validators);
  searchResults!: Observable<any>;
  noResults = false;
  isSearching = false;

  private _lengthToTriggerSearch = 3;

  constructor(@Optional() @Self() private controlDir: NgControl, private changeDetectorRef: ChangeDetectorRef) {
    this.lengthToTriggerSearch = '3';
    this.matErrorDefault = true;

    if (this.controlDir) {
      this.controlDir.valueAccessor = this;
    }
  }

  ngOnInit() {
    if (this.controlDir) {
      // Set validators for the outer ngControl equals to the inner
      const control = this.controlDir.control;
      const validators = control.validator
        ? [control.validator, this.inputControl.validator]
        : this.inputControl.validator;
      control.setValidators(validators);

      // Update outer ngControl status
      control.updateValueAndValidity({ emitEvent: false });

      this.inputControl.setValidators(validators);

      this.inputControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });

      if (this.inputControl?.errors?.required) {
        this.placeholder += ' *';
      }

    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.options) {
      if (this.isSearching) {
        this.isSearching = false;
        if (!changes.options.firstChange && !changes.options.currentValue.length) {
          this.noResults = true;
        } else {
          this.noResults = false;
        }
      }
    }
  }

  // Permite que o Angular atualize o inputControl.
  // Atualize o modelo e as alterações necessárias para a visualização aqui.
  writeValue(obj: any): void {
    if (obj === null) {
      this.inputControl.reset();
    } else {
      this.inputControl.setValue(obj);
    }
  }

  // Permite que o Angular registre uma função para ser chamada,
  // quando o inputControl mudar
  registerOnChange(fn: any): void {
    this.inputControl.valueChanges.pipe(debounceTime(200)).subscribe({
      next: (value) => {
        if (typeof value === 'string') {
          if (this.isMinLength(value)) {
            this.isSearching = true;

            // Fire change detection to display the searching status option
            this.changeDetectorRef.detectChanges();
            fn(value.toUpperCase());
          } else {
            this.isSearching = false;
            this.noResults = false;
            fn(null);
          }
        } else {
          fn(value);
        }
      }
    });
  }

  // Permite que o Angular registre uma função a ser chamada quando a entrada for tocada.
  // Salve a função como uma propriedade para chamar mais tarde aqui.
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onTouched() { }

  // Permite o Angular desabililtar o input
  setDisabledState?(isDisabled: boolean): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isDisabled ? this.inputControl.disable() : this.inputControl.enable();
  }

  // Método vinculado à entrada mat-autocomplete `[displayWith]`.
  // É assim que o nome do resultado é impresso na caixa de entrada
  displayFn(result: InputAutoComplete): string {
    return result ? result.nome : undefined;
  }

  isMinLength(value: string) {
    // eslint-disable-next-line no-underscore-dangle
    return value.length >= this._lengthToTriggerSearch;
  }

  optionSelected() {
    this.autoCompleteEvent.emit(this.inputControl.value);
  }

  private get validators(): ValidatorFn[] {
    return [containsIdValidation];
  }
}
import React, { FormHTMLAttributes, PropsWithChildren } from 'react';
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form';

import Switch from '../../cross-app-components/Switch';
import { connectWithFormUncontrolled } from './common/connectWithForm';
import Input from './Input';
import Checkbox from './Checkbox';
import TextArea from './TextArea';

interface FormProps<TFormValues>
    extends Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
    onSubmit: SubmitHandler<TFormValues>;
}

/**
 * @description
 * Use this to take advantage of automatic validation of form inputs based on rules supplied to individual elements.
 * Don't use this if you simply need an input element for DOM manipulation of some sort (i.e. filtering a list).
 *
 * Individual inputs are available as subcomponents of this:
 *
 * <Form.Input />, <Form.TextArea />, <Form.Checkbox />, <Form.Switch />
 *
 * @example
 * interface FormValues {
 *   name?: string;
 *   email: string;
 *   phone?: string;
 * }
 *
 * function handleSubmit(values: FormValues): void {
 *   ...
 * }
 *
 * <Form<FormValues> onSubmit={handleSubmit}>
 *   <Form.Input name="name" />
 *   <Form.Input type="email" name="email" rules={{ required: 'You must supply an e-mail address' }} />
 *   <Form.TextArea name="comment" rules={{ maxLength: { value: 255, message: 'You cannot enter more than 255 characters' } }} />
 *   <Form.Checkbox name="agree" rules={{ required: 'You must agree to this' }}>Agree to terms</Form.Checkbox>
 * </Form>
 */
export default function Form<T extends Record<string, unknown>>({
    children,
    onSubmit,
    ...formProps
}: PropsWithChildren<FormProps<T>>): JSX.Element {
    const { ...methods } = useForm<T>({
        mode: 'onTouched',
    });

    return (
        <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} {...formProps}>
                {children}
            </form>
        </FormProvider>
    );
}

Form.Input = connectWithFormUncontrolled(Input);
Form.TextArea = connectWithFormUncontrolled(TextArea);
Form.Checkbox = connectWithFormUncontrolled(Checkbox);
Form.Switch = connectWithFormUncontrolled(Switch);

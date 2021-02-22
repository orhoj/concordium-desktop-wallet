import React from 'react';
// also exported from '@storybook/react' if you can deal with breaking changes in 6.1
import { Story, Meta } from '@storybook/react/types-6-0';

import Button, { ButtonProps } from './Button';

export default {
    title: 'Cross App Components/Button',
    component: Button,
} as Meta;

const Template: Story<ButtonProps> = (args) => <Button {...args} />;

export const Primary = Template.bind({});
Primary.args = {
    inverted: false,
    children: 'Button',
    disabled: false,
};

export const Inverted = Template.bind({});
Inverted.args = {
    inverted: true,
    children: 'Button',
    disabled: false,
};

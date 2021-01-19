import React from 'react';
import { Grid } from 'semantic-ui-react';
import IdentityList from '../components/IdentityList';
import IdentityView from '../components/IdentityView';

export default function IdentityPage() {
    return (
        <Grid container columns={2} divided>
            <Grid.Row>
                <Grid.Column>
                    <IdentityList />
                </Grid.Column>
                <Grid.Column>
                    <IdentityView />
                </Grid.Column>
            </Grid.Row>
        </Grid>
    );
}

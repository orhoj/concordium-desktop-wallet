import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import clsx from 'clsx';
import { confirmedIdentitiesSelector } from '~/features/IdentitySlice';
import routes from '~/constants/routes.json';
import IdentityCard from '~/components/IdentityCard';
import { Identity } from '~/utils/types';
import Columns from '~/components/Columns';
import Button from '~/cross-app-components/Button';

import styles from './AccountCreation.module.scss';

interface Props {
    setIdentity: (identity: Identity) => void;
    identity: Identity | undefined;
}

export default function AccountCreationPickIdentity({
    setIdentity,
    identity,
}: Props): JSX.Element | null {
    const identities = useSelector(confirmedIdentitiesSelector);
    const initialIndex = useMemo(
        () => identities.findIndex((i) => i.id === identity?.id),
        [identities, identity]
    );
    const [chosenIndex, chooseIdentity] = useState(Math.max(initialIndex, 0));
    const dispatch = useDispatch();

    if (!identities) {
        return null;
    }

    function submit(route: string) {
        setIdentity(identities[chosenIndex]);
        dispatch(push(route));
    }

    return (
        <Columns columnScroll variableSize>
            <Columns.Column>
                <div className={styles.leftColumn}>
                    <h2>Choose an identity</h2>
                    <div className="flexChildFill flexColumn justifySpaceBetween">
                        <div>
                            <p>
                                The next step is to choose what identity to use,
                                for creating your new account. Besides choosing
                                your identity, you must decide whether to reveal
                                any attributes on the account, and how many.
                            </p>
                            <p>
                                Besides deciding on an identity, you can decide
                                to reveal a number of attributes on your
                                account, though this is not necessary.
                            </p>
                            <p>Which identity do you want to use?</p>
                        </div>
                        <div>
                            <Button
                                className={styles.button}
                                inverted
                                onClick={() =>
                                    submit(
                                        routes.ACCOUNTCREATION_PICKATTRIBUTES
                                    )
                                }
                            >
                                Reveal attributes
                            </Button>
                            <br />
                            <Button
                                className={clsx(styles.button, 'mT50')}
                                onClick={() =>
                                    submit(routes.ACCOUNTCREATION_GENERATE)
                                }
                            >
                                Submit without revealing attributes
                            </Button>
                        </div>
                    </div>
                </div>
            </Columns.Column>
            <Columns.Column noResize>
                <div className={styles.rightColumn}>
                    {identities.map((id, i) => (
                        <IdentityCard
                            className={styles.identityColumnElement}
                            identity={id}
                            key={id.id}
                            active={chosenIndex === i}
                            onClick={() => chooseIdentity(i)}
                        />
                    ))}
                </div>
            </Columns.Column>
        </Columns>
    );
}

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    addressBookSelector,
    chosenIndexSelector,
    removeFromAddressBook,
} from '../../../features/AddressBookSlice';
import DeleteAddress from '../DeleteAddress';
import UpsertAddress from '../../../components/UpsertAddress';
import Card from '../../../cross-app-components/Card';
import Button from '../../../cross-app-components/Button';

import EditIcon from '../../../../resources/svg/edit.svg';
import CopyIcon from '../../../../resources/svg/copy.svg';

import styles from './AddressBookSelected.module.scss';

export default function AddressBookElementView() {
    const dispatch = useDispatch();
    const chosenIndex = useSelector(chosenIndexSelector);
    const addressBook = useSelector(addressBookSelector);
    const chosenEntry = addressBook[chosenIndex];

    if (chosenIndex >= addressBook.length) {
        return null;
    }

    return (
        <Card className={styles.root}>
            <div className={styles.content}>
                <header className={styles.header}>
                    <h2 className={styles.heading}>{chosenEntry.name}</h2>
                    <span className={styles.actions}>
                        <UpsertAddress
                            as={Button}
                            disabled={chosenEntry.readOnly}
                            initialValues={chosenEntry}
                            clear
                        >
                            <EditIcon width="22" className={styles.icon} />
                        </UpsertAddress>
                        <DeleteAddress
                            entry={chosenEntry}
                            onRemove={(entry) =>
                                removeFromAddressBook(dispatch, entry)
                            }
                        />
                    </span>
                </header>
                <div className={styles.address}>
                    {chosenEntry.address}
                    <Button className={styles.copy} clear>
                        <CopyIcon width="18" className={styles.icon} />
                    </Button>
                </div>
                <div>
                    <h3 className={styles.notesHeading}>Notes</h3>
                    {chosenEntry.note}
                </div>
            </div>
        </Card>
    );
}

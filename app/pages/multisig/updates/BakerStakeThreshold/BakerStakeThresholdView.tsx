import React from 'react';
import Loading from '~/cross-app-components/Loading';
import { BlockSummary } from '~/node/NodeApiTypes';
import { BakerStakeThreshold } from '~/utils/types';
import withChainData, { ChainData } from '../../common/withChainData';
import { displayAsCCD } from '~/utils/ccd';
import Label from '~/components/Label';

interface Props extends ChainData {
    bakerStakeThreshold: BakerStakeThreshold;
}

/**
 * Displays an overview of a baker stake threshold.
 */
export default withChainData(function BakerStakeThresholdView({
    bakerStakeThreshold,
    blockSummary,
}: Props) {
    function renderCurrentValue(bs: BlockSummary): JSX.Element {
        return (
            <div>
                <Label className="mB5">Current baker stake threshold:</Label>
                <div className="body3 mono">
                    {displayAsCCD(
                        bs.updates.chainParameters.minimumThresholdForBaking
                    )}
                </div>
            </div>
        );
    }
    return (
        <>
            {blockSummary ? (
                renderCurrentValue(blockSummary)
            ) : (
                <Loading inline />
            )}
            <div>
                <Label className="mB5">New baker stake threshold:</Label>
                <div className="body3 mono">
                    {displayAsCCD(bakerStakeThreshold.threshold)}
                </div>
            </div>
        </>
    );
});

import _ from 'lodash';
import { useReducer } from 'react';

export default function useComplexStateMerging<S extends object>(initialState: S): [S, React.Dispatch<Partial<S>>] {
    return useReducer((prevState: S, newState: Partial<S>) => {
        if (_.isMatch(prevState, newState)) return prevState;
        return _.merge({}, prevState, newState);
    }, initialState);
}

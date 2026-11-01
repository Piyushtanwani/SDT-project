import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

/**
 * The admin area opens on what the server says about this token, not on what the browser
 * happens to have stored. A role in sessionStorage is a string anyone can type into a
 * devtools console; `/api/auth/whoami` is answered by the backend from the signed JWT, so
 * the result cannot be edited into "ADMIN".
 *
 * This is still only half a gate — every admin endpoint re-checks the role itself. Hiding
 * the pages keeps honest users out of screens that would only error, and stops someone
 * from mapping which admin routes exist.
 */
function ProtectedAdmin() {
    const [state, setState] = useState(() => ({ status: 'checking' }));
    const isMounted = useRef(true);
    const navigate = useNavigate();

    const verify = useCallback(() => {
        setState({ status: 'checking' });
        fetch(`${API_BASE_URL}/api/auth/whoami`, { headers: { ...getAuthHeaders() } })
            .then((res) => {
                if (res.status === 401 || res.status === 403) return { kind: 'rejected' };
                if (!res.ok) return { kind: 'unreachable', message: `The server answered ${res.status}.` };
                return res.json().then((user) => ({ kind: 'answered', user }));
            })
            .then((outcome) => {
                if (!isMounted.current) return;
                if (outcome.kind === 'rejected') {
                    sessionStorage.clear();
                    setState({ status: 'signedOut' });
                } else if (outcome.kind === 'unreachable') {
                    setState({ status: 'unreachable', message: outcome.message });
                } else {
                    const role = (outcome.user?.role || '').toUpperCase();
                    setState(role === 'ADMIN'
                        ? { status: 'admin' }
                        : { status: 'notAdmin' });
                }
            })
            .catch(() => {
                if (isMounted.current) {
                    setState({
                        status: 'unreachable',
                        message: 'We could not reach the server to confirm your account.',
                    });
                }
            });
    }, []);

    useEffect(() => {
        isMounted.current = true;
        if (sessionStorage.getItem('authToken')) {
            verify();
        } else {
            setState({ status: 'signedOut' });
        }
        return () => {
            isMounted.current = false;
        };
    }, [verify]);

    if (state.status === 'signedOut') return <Navigate to="/login" replace />;
    if (state.status === 'notAdmin') return <Navigate to="/" replace />;

    if (state.status === 'unreachable') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
                <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                    <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                        Could not confirm your access
                    </h1>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                        {state.message} The admin console stays closed until your account can be
                        checked, so nothing here opens on trust.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                        <button
                            type="button"
                            onClick={verify}
                            className="min-h-[44px] px-5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                        >
                            Try again
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="min-h-[44px] px-5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Back to my dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (state.status !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-4 border-indigo-200 dark:border-gray-700 border-t-indigo-600"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Checking your permissions…</p>
                </div>
            </div>
        );
    }

    return <Outlet />;
}

export default ProtectedAdmin;

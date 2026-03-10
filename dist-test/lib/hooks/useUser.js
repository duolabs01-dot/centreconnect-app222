'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUser = useUser;
const react_1 = require("react");
const client_1 = require("@/lib/supabase/client");
function useUser() {
    const [user, setUser] = (0, react_1.useState)(null);
    const [profile, setProfile] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const supabase = (0, react_1.useMemo)(() => (0, client_1.createClient)(), []);
    const loadProfile = (0, react_1.useCallback)(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error)
                throw error;
            setProfile(data);
        }
        catch (error) {
            // Only log errors in development
            if (process.env.NODE_ENV === 'development') {
                console.error('Error loading profile:', error);
            }
        }
        finally {
            setLoading(false);
        }
    }, [supabase]);
    (0, react_1.useEffect)(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            var _a;
            setUser((_a = session === null || session === void 0 ? void 0 : session.user) !== null && _a !== void 0 ? _a : null);
            if (session === null || session === void 0 ? void 0 : session.user) {
                loadProfile(session.user.id);
            }
            else {
                setLoading(false);
            }
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            var _a;
            setUser((_a = session === null || session === void 0 ? void 0 : session.user) !== null && _a !== void 0 ? _a : null);
            if (session === null || session === void 0 ? void 0 : session.user) {
                loadProfile(session.user.id);
            }
            else {
                setProfile(null);
                setLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    }, [loadProfile, supabase.auth]);
    return { user, profile, loading, isAuthenticated: !!user };
}

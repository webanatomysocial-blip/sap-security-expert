import { createContext, useContext, useState, useEffect, useCallback } from "react";

/**
 * MemberAuthContext — provides member session state to frontend components.
 * Member auth is localStorage-based (matches contributor pattern).
 * Keys: memberAuth="true", memberData=JSON, memberToken=<string>
 *
 * Also tracks premium subscription state:
 *   isPremiumMember — true when the member has an active paid subscription
 *   subscription    — { plan_name, expires_at } or null
 */
const MemberAuthContext = createContext(null);

export const MemberAuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [member, setMember] = useState(null);
  const [isContributor, setIsContributor] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isPremiumMember, setIsPremiumMember] = useState(false);

  const applySubscription = useCallback((sub) => {
    const active = sub && new Date(sub.expires_at) > new Date();
    setSubscription(active ? sub : null);
    setIsPremiumMember(!!active);
  }, []);

  // Rehydrate from localStorage on mount and fetch fresh data from server
  useEffect(() => {
    const auth = localStorage.getItem("memberAuth");
    if (auth === "true") {
      const savedMember = JSON.parse(localStorage.getItem("memberData") || "null");
      if (savedMember) {
        setIsLoggedIn(true);
        setMember(savedMember);
        setIsContributor(localStorage.getItem("isContributor") === "true");

        // Restore cached subscription from localStorage
        const cachedSub = JSON.parse(localStorage.getItem("memberSubscription") || "null");
        if (cachedSub) applySubscription(cachedSub);

        // Fetch fresh data from server
        import("../services/api").then(({ getMemberProfile }) => {
          getMemberProfile()
            .then((res) => {
              if (res.data.status === "success") {
                const freshMember = res.data.member;
                setMember(freshMember);
                localStorage.setItem("memberData", JSON.stringify(freshMember));
                const freshSub = res.data.subscription || null;
                applySubscription(freshSub);
                localStorage.setItem("memberSubscription", JSON.stringify(freshSub));
              }
            })
            .catch((err) => {
              if (err.response?.status === 401) logout();
            });
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (memberData, token, isContrib = false, sub = null) => {
    setIsLoggedIn(true);
    setMember(memberData);
    setIsContributor(isContrib);
    applySubscription(sub);
    localStorage.setItem("memberAuth", "true");
    localStorage.setItem("memberData", JSON.stringify(memberData));
    localStorage.setItem("memberToken", token);
    localStorage.setItem("isContributor", isContrib ? "true" : "false");
    localStorage.setItem("memberSubscription", JSON.stringify(sub));
  };

  const updateMember = (updatedMemberData) => {
    setMember(updatedMemberData);
    localStorage.setItem("memberData", JSON.stringify(updatedMemberData));
  };

  // Called after a successful Razorpay payment verification
  const activatePremium = (sub) => {
    applySubscription(sub);
    localStorage.setItem("memberSubscription", JSON.stringify(sub));
  };

  const logout = () => {
    setIsLoggedIn(false);
    setMember(null);
    setIsContributor(false);
    setSubscription(null);
    setIsPremiumMember(false);
    localStorage.removeItem("memberAuth");
    localStorage.removeItem("memberData");
    localStorage.removeItem("memberToken");
    localStorage.removeItem("isContributor");
    localStorage.removeItem("memberSubscription");
  };

  return (
    <MemberAuthContext.Provider
      value={{
        isLoggedIn,
        member,
        isContributor,
        subscription,
        isPremiumMember,
        login,
        logout,
        updateMember,
        activatePremium,
      }}
    >
      {children}
    </MemberAuthContext.Provider>
  );
};

export const useMemberAuth = () => {
  const ctx = useContext(MemberAuthContext);
  if (!ctx) throw new Error("useMemberAuth must be inside MemberAuthProvider");
  return ctx;
};

export default MemberAuthContext;

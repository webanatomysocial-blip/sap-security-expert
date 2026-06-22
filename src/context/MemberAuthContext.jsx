import { createContext, useContext, useState, useEffect, useCallback } from "react";

const MemberAuthContext = createContext(null);

export const MemberAuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [member, setMember] = useState(null);
  const [isContributor, setIsContributor] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [unlockedSlugs, setUnlockedSlugs] = useState([]);

  // Refresh credits + unlocks from server
  const refreshCredits = useCallback(() => {
    import("../services/api").then(({ getMyCredits, getMyUnlocks }) => {
      getMyCredits()
        .then((res) => {
          const bal = res.data?.balance ?? 0;
          setCreditBalance(bal);
          localStorage.setItem("memberCredits", String(bal));
        })
        .catch(() => {});
      getMyUnlocks()
        .then((res) => {
          const slugs = (res.data?.unlocks || []).map((u) => u.blog_slug);
          setUnlockedSlugs(slugs);
          localStorage.setItem("memberUnlocks", JSON.stringify(slugs));
        })
        .catch(() => {});
    });
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

        // Restore cached credits/unlocks
        const cachedBal = parseInt(localStorage.getItem("memberCredits") || "0");
        setCreditBalance(cachedBal);
        const cachedUnlocks = JSON.parse(localStorage.getItem("memberUnlocks") || "[]");
        setUnlockedSlugs(cachedUnlocks);

        // Fetch fresh profile
        import("../services/api").then(({ getMemberProfile }) => {
          getMemberProfile()
            .then((res) => {
              if (res.data.status === "success") {
                const freshMember = res.data.member;
                setMember(freshMember);
                localStorage.setItem("memberData", JSON.stringify(freshMember));
              }
            })
            .catch((err) => {
              if (err.response?.status === 401) logout();
            });
        });

        // Fetch fresh credits + unlocks
        refreshCredits();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (memberData, token, isContrib = false) => {
    setIsLoggedIn(true);
    setMember(memberData);
    setIsContributor(isContrib);
    localStorage.setItem("memberAuth", "true");
    localStorage.setItem("memberData", JSON.stringify(memberData));
    localStorage.setItem("memberToken", token);
    localStorage.setItem("isContributor", isContrib ? "true" : "false");
    // Fetch credits after login
    setTimeout(() => refreshCredits(), 200);
  };

  const updateMember = (updatedMemberData) => {
    setMember(updatedMemberData);
    localStorage.setItem("memberData", JSON.stringify(updatedMemberData));
  };

  // Call after a successful blog unlock to update local state immediately
  const onBlogUnlocked = (slug, newBalance) => {
    setUnlockedSlugs((prev) => {
      const updated = [...new Set([...prev, slug])];
      localStorage.setItem("memberUnlocks", JSON.stringify(updated));
      return updated;
    });
    if (newBalance !== undefined) {
      setCreditBalance(newBalance);
      localStorage.setItem("memberCredits", String(newBalance));
    }
  };

  // Call after purchasing a bundle to update credit balance
  const onCreditsPurchased = (newBalance) => {
    setCreditBalance(newBalance);
    localStorage.setItem("memberCredits", String(newBalance));
  };

  const isUnlocked = useCallback((slug) => unlockedSlugs.includes(slug), [unlockedSlugs]);

  const logout = () => {
    setIsLoggedIn(false);
    setMember(null);
    setIsContributor(false);
    setCreditBalance(0);
    setUnlockedSlugs([]);
    localStorage.removeItem("memberAuth");
    localStorage.removeItem("memberData");
    localStorage.removeItem("memberToken");
    localStorage.removeItem("isContributor");
    localStorage.removeItem("memberCredits");
    localStorage.removeItem("memberUnlocks");
  };

  return (
    <MemberAuthContext.Provider
      value={{
        isLoggedIn,
        member,
        isContributor,
        creditBalance,
        unlockedSlugs,
        isUnlocked,
        refreshCredits,
        login,
        logout,
        updateMember,
        onBlogUnlocked,
        onCreditsPurchased,
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

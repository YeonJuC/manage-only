import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type Props = {
  /** 스크롤이 window가 아니라 특정 컨테이너면 selector로 지정 */
  containerSelector?: string; // e.g. "#mainScroll" or ".layoutMain"
};

export default function ScrollToTop({ containerSelector }: Props) {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const el = containerSelector ? (document.querySelector(containerSelector) as HTMLElement | null) : null;

    // 1) 컨테이너 스크롤이면 컨테이너를 올림
    if (el) {
      el.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    // 2) 기본: window 스크롤 올림
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search, hash, containerSelector]);

  return null;
}

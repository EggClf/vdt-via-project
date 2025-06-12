import Link from "next/link";
import { deepInfraLogo as DeepInfraLogo } from "./icons";

export const Header = () => {
  return (
    <div className="fixed right-0 left-0 w-full top-0 bg-white dark:bg-zinc-950">
      <div className="flex justify-between items-center p-4">
        <div className="flex flex-row items-center gap-2 shrink-0 ">
          <span className="jsx-e3e12cc6f9ad5a71 flex flex-row items-center gap-2 home-links">
            <div className="jsx-e3e12cc6f9ad5a71 flex flex-row items-center gap-4">
              <Link
                className="flex flex-row items-end gap-2"
                target="_blank"
                href="https://deepinfra.com"
              >
                <DeepInfraLogo size={42} />
              </Link>
            </div>
          </span>
        </div>
      </div>
    </div>
  );
};

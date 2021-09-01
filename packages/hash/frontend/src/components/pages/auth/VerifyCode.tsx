import React, { VFC, useRef, useEffect, useCallback, useState } from "react";
import { tw } from "twind";
import Logo from "../../../assets/svg/logo.svg";
import { IconHash } from "../../Icons/IconHash";
import { IconKeyboardReturn } from "../../Icons/IconKeyboardReturn";
import { SYNTHETIC_LOADING_TIME_MS } from "./utils";

type VerifyCodeProps = {
  defaultCode?: string;
  goBack: () => void;
  loading: boolean;
  errorMessage?: string;
  loginIdentifier: string;
  handleSubmit: (code: string, withSyntheticLoading?: boolean) => void;
  requestCode: () => void;
  requestCodeLoading: boolean;
};

const isShortname = (identifier: string) => !identifier.includes("@");

const parseVerificationCodeInput = (inputCode: string) =>
  inputCode.replace(/\s/g, "");

const isVerificationCodeValid = (code: string) => {
  const units = code.split("-");
  return units.length >= 4 && units?.[3].length > 0;
};

export const VerifyCode: VFC<VerifyCodeProps> = ({
  defaultCode,
  goBack,
  errorMessage,
  loginIdentifier,
  handleSubmit,
  loading,
  requestCode,
  requestCodeLoading,
}) => {
  const [state, setState] = useState({
    text: defaultCode || "",
    emailResent: false,
    syntheticLoading: false,
  });

  const { text, emailResent, syntheticLoading } = state;
  const inputRef = useRef<HTMLInputElement>(null);

  const updateState = useCallback((newState) => {
    setState((prevState) => ({
      ...prevState,
      ...newState,
    }));
  }, []);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const isInputValid = useCallback(() => isVerificationCodeValid(text), [text]);

  const onSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    void handleSubmit(text);
  };

  const handleResendCode = async () => {
    updateState({ syntheticLoading: true });
    setTimeout(async () => {
      try {
        await requestCode();
        updateState({ emailResent: true, syntheticLoading: false });
        setTimeout(() => updateState({ emailResent: false }), 5000);
      } catch (err) {
        updateState({ syntheticLoading: false });
      }
    }, SYNTHETIC_LOADING_TIME_MS);
  };

  return (
    <div className={tw`w-8/12 max-w-4xl`}>
      <Logo className={tw`mb-6`} />
      <div
        className={tw`h-96 mb-9 rounded-2xl bg-white shadow-xl flex justify-center items-center text-center`}
      >
        <div className={tw`w-8/12`}>
          <p className={tw`font-bold`}>
            A verification code has been sent to{" "}
            <span>
              {isShortname(loginIdentifier)
                ? "your primary email address"
                : loginIdentifier}
            </span>
          </p>
          <p className={tw`mb-10`}>
            Click the link in this email or enter the verification phrase below
            to continue
          </p>
          <form className={tw`relative`} onSubmit={onSubmit}>
            <input
              className={tw`block border-b-1 border-gray-300 w-11/12 mx-auto mb-2 py-3 pl-3 pr-20 text-2xl text-center focus:outline-none focus:border-blue-500`}
              onChange={({ target }) =>
                updateState({ text: parseVerificationCodeInput(target.value) })
              }
              onPaste={({ clipboardData }) => {
                const pastedCode = parseVerificationCodeInput(
                  clipboardData.getData("Text")
                );
                if (isVerificationCodeValid(pastedCode)) {
                  void handleSubmit(pastedCode, true);
                }
              }}
              value={text}
              ref={inputRef}
            />
            <button
              className={tw`absolute right-0 top-1/2 mr-3 transition-all -translate-y-1/2 flex items-center disabled:opacity-40 disabled:pointer-events-none text-blue-500 hover:text-blue-700 font-bold py-2 px-2`}
              disabled={!isInputValid() || loading}
            >
              {loading ? (
                <>
                  <span className={tw`mr-1`}>Loading</span>
                  <IconHash className={tw`h-4 w-4 animate-spin`} />
                </>
              ) : (
                <>
                  <span className={tw`mr-1`}>Submit</span>
                  <IconKeyboardReturn />
                </>
              )}
            </button>
          </form>
          {errorMessage && (
            <span className={tw`text-red-500 text-sm`}>{errorMessage}</span>
          )}
        </div>
      </div>
      <div className={tw`flex justify-between`}>
        <button
          className={tw`border-b-1 border-transparent hover:border-current`}
          onClick={goBack}
        >
          &larr; <span className={tw`ml-1`}>Try logging in another way</span>
        </button>
        {emailResent ? (
          <div className={tw`flex items-center`}>
            <span className={tw`mr-1`}>No email yet?</span>
            <span className={tw`font-bold text-green-500`}>Email Resent</span>
          </div>
        ) : (
          <div className={tw`flex items-center`}>
            <span className={tw`mr-1`}>No email yet?</span>
            <button
              className={tw`text-blue-500 focus:text-blue-700 hover:text-blue-700 disabled:opacity-50 font-bold focus:outline-none flex items-center`}
              onClick={handleResendCode}
              disabled={requestCodeLoading || syntheticLoading}
            >
              <span>Resend email</span>
              {(requestCodeLoading || syntheticLoading) && (
                <IconHash className={tw`h-3 w-3 ml-1 animate-spin`} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  id: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
};

export function PasswordInput({
  id,
  name,
  placeholder = "Tu contraseña",
  required = true,
  minLength,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
      />
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:text-[#9D4EDD]"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

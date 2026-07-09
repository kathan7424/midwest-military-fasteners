/**
 * File Name: AddressesPanel.tsx
 * Description: My Account → Addresses — WooCommerce standard: display cards
 *   with Edit button, inline edit form with all fields, save per type.
 * Developer: KP-184
 * Created Date: 2026-07-09
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import {
  FIELD_ERROR_CLASS,
  INPUT_CLASS,
  INPUT_ERROR_CLASS,
  LABEL_CLASS,
  SELECT_CLASS,
} from "@/components/shared_Ui/form-styles";
import SkeletonBlock from "@/components/shared_Ui/skeletons/SkeletonBlock";
import {
  fetch_addresses,
  update_address,
  type AccountAddress,
  type AddressesResponse,
} from "@/services/account.client";
import { fetch_checkout_locations } from "@/services/checkout.client";
import type { CheckoutLocations } from "@/types/checkout.types";

function AddressDisplay({ address }: { address: AccountAddress }) {
  const hasAddress = Boolean(address.address_1 || address.city);

  if (!hasAddress) {
    return (
      <p className="text-link text-dark-gray">
        You have not set up this type of address yet.
      </p>
    );
  }

  return (
    <address className="space-y-0.5 text-link not-italic text-dark-gray">
      <p className="font-semibold text-near-black">
        {`${address.first_name} ${address.last_name}`.trim()}
      </p>
      {address.company ? <p>{address.company}</p> : null}
      <p>{address.address_1}</p>
      {address.address_2 ? <p>{address.address_2}</p> : null}
      <p>
        {address.city}, {address.state} {address.postcode}
      </p>
      <p>{address.country}</p>
      {address.email ? <p className="pt-1">{address.email}</p> : null}
      {address.phone ? <p>{address.phone}</p> : null}
    </address>
  );
}

function AddressEditForm({
  type,
  initial,
  locations,
  onSaved,
  onCancel,
}: {
  type: "billing" | "shipping";
  initial: AccountAddress;
  locations: CheckoutLocations | null;
  onSaved: (updated: AccountAddress) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<AccountAddress>({ ...initial });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (name: keyof AccountAddress, value: string) => {
    setFields((prev) => {
      if (name === "country" && value !== prev.country) {
        return { ...prev, country: value, state: "" };
      }
      return { ...prev, [name]: value };
    });
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const countryStates = locations?.states[fields.country] ?? [];

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!fields.first_name.trim()) errors.first_name = "First name is required.";
    if (!fields.last_name.trim()) errors.last_name = "Last name is required.";
    if (!fields.address_1.trim()) errors.address_1 = "Street address is required.";
    if (!fields.city.trim()) errors.city = "City is required.";
    if (!fields.postcode.trim()) errors.postcode = "Postcode is required.";
    if (!fields.country.trim()) errors.country = "Country is required.";
    if (type === "billing" && !fields.email?.trim()) errors.email = "Email is required.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!validate()) return;

    setIsSaving(true);

    const { ok, data } = await update_address({
      type,
      first_name: fields.first_name.trim(),
      last_name: fields.last_name.trim(),
      company: (fields.company ?? "").trim(),
      address_1: fields.address_1.trim(),
      address_2: (fields.address_2 ?? "").trim(),
      city: fields.city.trim(),
      state: fields.state.trim(),
      postcode: fields.postcode.trim(),
      country: fields.country.trim(),
      ...(type === "billing"
        ? { email: (fields.email ?? "").trim(), phone: (fields.phone ?? "").trim() }
        : {}),
    });

    if (ok) {
      onSaved(fields);
    } else {
      setError(data.message || "Could not save address.");
    }

    setIsSaving(false);
  };

  const renderField = (
    label: string,
    name: keyof AccountAddress,
    options?: { required?: boolean; type?: string; autoComplete?: string }
  ) => (
    <label className="block">
      <span className={LABEL_CLASS}>
        {label}
        {options?.required ? <span className="text-[#E12222]"> *</span> : null}
      </span>
      <input
        type={options?.type ?? "text"}
        value={(fields[name] as string) ?? ""}
        onChange={(e) => handleChange(name, e.target.value)}
        className={`${INPUT_CLASS} ${fieldErrors[name] ? INPUT_ERROR_CLASS : ""}`}
        autoComplete={options?.autoComplete}
      />
      {fieldErrors[name] ? (
        <p className={FIELD_ERROR_CLASS}>{fieldErrors[name]}</p>
      ) : null}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {renderField("First name", "first_name", { required: true, autoComplete: "given-name" })}
        {renderField("Last name", "last_name", { required: true, autoComplete: "family-name" })}

        <div className="sm:col-span-2">
          {renderField("Company", "company", { autoComplete: "organization" })}
        </div>

        <div className="sm:col-span-2">
          {renderField("Street address", "address_1", { required: true, autoComplete: "address-line1" })}
        </div>

        <div className="sm:col-span-2">
          {renderField("Apartment, suite, etc.", "address_2", { autoComplete: "address-line2" })}
        </div>

        {locations ? (
          <label className="block">
            <span className={LABEL_CLASS}>
              Country <span className="text-[#E12222]">*</span>
            </span>
            <select
              value={fields.country}
              onChange={(e) => handleChange("country", e.target.value)}
              className={SELECT_CLASS}
              autoComplete="country"
            >
              <option value="">Select country...</option>
              {locations.countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
        ) : (
          renderField("Country", "country", { required: true, autoComplete: "country" })
        )}

        {countryStates.length > 0 ? (
          <label className="block">
            <span className={LABEL_CLASS}>
              State <span className="text-[#E12222]">*</span>
            </span>
            <select
              value={fields.state}
              onChange={(e) => handleChange("state", e.target.value)}
              className={SELECT_CLASS}
              autoComplete="address-level1"
            >
              <option value="">Select state...</option>
              {countryStates.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </label>
        ) : (
          renderField("State / Province", "state", { autoComplete: "address-level1" })
        )}

        {renderField("City", "city", { required: true, autoComplete: "address-level2" })}
        {renderField("Postcode / ZIP", "postcode", { required: true, autoComplete: "postal-code" })}

        {type === "billing" ? (
          <>
            {renderField("Email", "email", { required: true, type: "email", autoComplete: "email" })}
            {renderField("Phone", "phone", { type: "tel", autoComplete: "tel" })}
          </>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center bg-amber px-8 py-3 text-link font-semibold uppercase text-white transition-colors hover:bg-blue disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save address"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center border border-light-gray px-6 py-3 text-link font-semibold uppercase text-dark-gray transition-colors hover:bg-off-white disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddressCard({
  title,
  type,
  address,
  locations,
  onUpdated,
}: {
  title: string;
  type: "billing" | "shipping";
  address: AccountAddress;
  locations: CheckoutLocations | null;
  onUpdated: (addr: AccountAddress) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="border border-light-gray bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-label font-bold uppercase text-near-black">{title}</h3>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue transition-colors hover:text-amber"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Edit
          </button>
        ) : null}
      </div>

      {isEditing ? (
        <AddressEditForm
          type={type}
          initial={address}
          locations={locations}
          onSaved={(updated) => {
            onUpdated(updated);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <AddressDisplay address={address} />
      )}
    </div>
  );
}

function AddressesSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="border border-light-gray bg-white p-5">
          <SkeletonBlock className="mb-4 h-5 w-32" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-4 w-56" />
            <SkeletonBlock className="h-4 w-36" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AddressesPanel() {
  const [addresses, setAddresses] = useState<AddressesResponse | null>(null);
  const [locations, setLocations] = useState<CheckoutLocations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    void (async () => {
      const [addrResult, locResult] = await Promise.all([
        fetch_addresses(),
        fetch_checkout_locations(),
      ]);

      if (addrResult) {
        setAddresses(addrResult);
      } else {
        setError("Unable to load your saved addresses.");
      }

      setLocations(locResult);
      setIsLoading(false);
    })();
  }, []);

  if (isLoading) {
    return <AddressesSkeleton />;
  }

  if (error || !addresses) {
    return <p className="text-link text-red-600">{error || "Unable to load your saved addresses."}</p>;
  }

  return (
    <>
      <p className="mb-6 text-link text-dark-gray">
        The following addresses will be used on the checkout page by default.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <AddressCard
          title="Billing Address"
          type="billing"
          address={addresses.billing}
          locations={locations}
          onUpdated={(updated) =>
            setAddresses((prev) => prev ? { ...prev, billing: updated } : prev)
          }
        />
        <AddressCard
          title="Shipping Address"
          type="shipping"
          address={addresses.shipping}
          locations={locations}
          onUpdated={(updated) =>
            setAddresses((prev) => prev ? { ...prev, shipping: updated } : prev)
          }
        />
      </div>
    </>
  );
}

import { Tab } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/20/solid";
import {
  BuildingOfficeIcon,
  CreditCardIcon,
  KeyIcon,
  UserIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import generateApiKey from "generate-api-key";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { DEMO_EMAIL } from "../../../lib/constants";
import { hashAuth } from "../../../lib/hashClient";
import { middleTruncString } from "../../../lib/stringHelpers";

import { useDeleteKey, useGetKeys } from "../../../services/hooks/keys";
import { Database } from "../../../supabase/database.types";
import { clsx } from "../../shared/clsx";
import LoadingAnimation from "../../shared/loadingAnimation";
import useNotification from "../../shared/notification/useNotification";
import ThemedModal from "../../shared/themed/themedModal";
import ThemedTable from "../../shared/themed/themedTable";
import ThemedTabs from "../../shared/themed/themedTabs";
import AddHeliconeKeyModal from "./addHeliconeKeyModal";
import AddKeyModal from "./addKeyModal";
import { useKeysPage } from "./useKeysPage";

interface KeyPageProps {
  hideTabs?: boolean;
}

const KeyPage = (props: KeyPageProps) => {
  const user = useUser();
  const router = useRouter();
  const supabaseClient = useSupabaseClient<Database>();
  const [selectedKey, setSelectedKey] =
    useState<Database["public"]["Tables"]["user_api_keys"]["Row"]>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("OpenAI Keys");

  // Helicone states
  const [name, setName] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [addHeliconeOpen, setAddHeliconeOpen] = useState(false);
  const [deleteHeliconeOpen, setDeleteHeliconeOpen] = useState(false);
  const [selectedHeliconeKey, setSelectedHeliconeKey] =
    useState<Database["public"]["Tables"]["helicone_api_keys"]["Row"]>();

  const onDeleteHandler = (
    key: Database["public"]["Tables"]["user_api_keys"]["Row"]
  ) => {
    setSelectedKey(key);
    setDeleteOpen(true);
  };

  const onDeleteHeliconeHandler = (
    key: Database["public"]["Tables"]["helicone_api_keys"]["Row"]
  ) => {
    setSelectedHeliconeKey(key);
    setDeleteHeliconeOpen(true);
  };

  const {
    count,
    heliconeKeys,
    isLoading,
    keys,
    refetchHeliconeKeys,
    refetchKeys,
  } = useKeysPage();

  const { deleteKey, error } = useDeleteKey();

  const { setNotification } = useNotification();

  const renderKeyTable = () => {
    if (count < 1) {
      return (
        <div className="mt-10 relative block w-full rounded-lg border-2 border-red-300 p-12 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          <div className="w-full justify-center align-middle items-center">
            <KeyIcon className="h-10 w-10 mx-auto text-red-500" />
          </div>

          <span className="mt-2 block text-sm font-medium text-red-500">
            Add a key to get started using Helicone
          </span>
        </div>
      );
    } else {
      return (
        <ThemedTable
          columns={[
            { name: "Name", key: "key_name", hidden: false },
            { name: "Hash", key: "api_key_hash", hidden: true },
            { name: "Preview", key: "api_key_preview", hidden: true },
            { name: "Created", key: "created_at", hidden: false },
          ]}
          rows={keys.map((key) => {
            return {
              ...key,
              key_name: (
                <input
                  type="string"
                  defaultValue={key.key_name ?? "No Name"}
                  className="max-w-sm border-none outline-none"
                  onChange={(e) => {
                    supabaseClient
                      .from("user_api_keys")
                      .update({
                        key_name: e.target.value,
                      })
                      .eq("api_key_hash", key.api_key_hash)
                      .then((res) => {
                        console.log(res);
                      });
                  }}
                />
              ),
            };
          })}
          deleteHandler={onDeleteHandler}
        />
      );
    }
  };

  const renderHeliconeKeyTable = () => {
    if ((heliconeKeys?.data?.length ?? 0) < 1) {
      return (
        <div className="mt-10 relative block w-full rounded-lg border-2 border-dashed border-red-300 p-12 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          <div className="w-full justify-center align-middle items-center">
            <KeyIcon className="h-10 w-10 mx-auto text-red-500" />
          </div>

          <span className="mt-2 block text-sm font-medium text-red-500">
            Add a key to get started using Helicone{"'"}s API Key
          </span>
        </div>
      );
    } else {
      return (
        <ThemedTable
          columns={[
            { name: "Name", key: "key_name", hidden: false },
            { name: "Created", key: "created_at", hidden: false },
          ]}
          rows={heliconeKeys?.data?.map((key) => {
            return {
              ...key,
              key_name: (
                <input
                  type="string"
                  defaultValue={key.api_key_name ?? "No Name"}
                  className="max-w-sm border-none outline-none"
                  onChange={(e) => {
                    supabaseClient
                      .from("helicone_api_keys")
                      .update({
                        api_key_name: e.target.value,
                      })
                      .eq("api_key_hash", key.api_key_hash)
                      .then((res) => {
                        console.log(res);
                      });
                  }}
                />
              ),
            };
          })}
          deleteHandler={onDeleteHeliconeHandler}
        />
      );
    }
  };

  return (
    <>
      {props.hideTabs !== true && (
        <ThemedTabs
          options={[
            {
              icon: KeyIcon,
              label: "OpenAI Keys",
            },
            {
              icon: BuildingOfficeIcon,
              label: "Helicone Keys",
            },
          ]}
          onOptionSelect={(option) => {
            setSelectedTab(option);
          }}
        />
      )}
      {selectedTab === "OpenAI Keys" && (
        <div className="flex flex-col gap-2 max-w-2xl space-y-12 mt-8">
          <div className="text-gray-900 space-y-4 text-sm">
            <div className="flex flex-row sm:items-center pb-2 mb-2 justify-between">
              <div className="sm:flex-auto items-center flex flex-row space-x-4">
                <h1 className="text-lg font-semibold text-gray-900">
                  Open AI Keys
                </h1>
              </div>
            </div>
            <p>
              Your API keys are used to authenticate your requests to the OpenAI
              API. Please note that we do{" "}
              <span className="font-semibold">not</span> store your API key on
              our servers.
            </p>
            <p>
              How do we do this? We log each request to our API using a hashed
              version of your API key. This allows us to identify your account
              without storing your API key.{" "}
              <Link
                href="https://docs.helicone.ai/getting-started/how-encryption-works"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex flex-row w-fit"
              >
                Learn More
              </Link>
            </p>
            {isLoading ? (
              <LoadingAnimation title={"Loading your keys..."} />
            ) : (
              <div className="space-y-6 pt-2">
                {renderKeyTable()}
                <div className="w-full flex justify-start">
                  <button
                    onClick={() => setAddOpen(true)}
                    className="items-center rounded-md bg-black px-3 py-1.5 text-md flex font-normal text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <PlusIcon className="h-5 w-5 inline" />
                    Add Key
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {selectedTab === "Helicone Keys" && (
        <div className="flex flex-col gap-2 max-w-2xl space-y-12 mt-8">
          <div className="text-gray-900 space-y-4 text-sm">
            <div className="flex flex-row sm:items-center pb-2 mb-2 justify-between">
              <div className="sm:flex-auto items-center flex flex-row space-x-4 justify-between">
                <h1 className="text-lg font-semibold text-gray-900">
                  Helicone API (beta)
                </h1>
                <Link
                  href="/api/graphql"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="text-xs w-full mx-auto bg-sky-600 hover:bg-sky-800 text-white font-semibold py-2 px-4 rounded-md">
                    Visit GraphQL playground
                  </button>
                </Link>
              </div>
            </div>
            <p className="text-sm text-gray-900">
              The keys below are used for the Helicone API. This is currently in
              beta and will be subject to change.
            </p>
            {isLoading ? (
              <LoadingAnimation title={"Loading your keys..."} />
            ) : (
              <div className="space-y-6 pt-2">
                {renderHeliconeKeyTable()}
                <div className="mt-5 sm:flex sm:items-center gap-5">
                  <div className="w-full sm:max-w-xs">
                    <label htmlFor="api-key" className="sr-only">
                      name
                    </label>
                    <input
                      type="text"
                      name="api-key"
                      id="api-key"
                      value={name}
                      className="block w-full rounded-md border border-gray-300 shadow-sm focus:border-theme-primary-dark focus:ring-theme-primary-dark sm:text-sm p-2"
                      placeholder="API key name"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const apiKey = `sk-${generateApiKey({
                        method: "base32",
                        dashes: true,
                      }).toString()}`.toLowerCase();
                      setApiKey(apiKey);
                      setAddHeliconeOpen(true);
                      hashAuth(apiKey).then((res) => {
                        supabaseClient
                          .from("helicone_api_keys")
                          .insert({
                            api_key_hash: res,
                            user_id: user?.id!,
                            api_key_name: name,
                          })
                          .then((res) => refetchHeliconeKeys());
                      });
                    }}
                    className="items-center rounded-md bg-black px-3.5 py-1.5 text-base font-medium leading-7 text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Generate Key
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {addOpen && <AddKeyModal open={addOpen} setOpen={setAddOpen} />}

      {
        <AddHeliconeKeyModal
          open={addHeliconeOpen}
          setOpen={setAddHeliconeOpen}
          apiKey={apiKey}
        />
      }

      {deleteHeliconeOpen && selectedHeliconeKey !== undefined && (
        <ThemedModal open={deleteHeliconeOpen} setOpen={setDeleteHeliconeOpen}>
          <div className="flex flex-col gap-4 w-full">
            <p className="font-bold text-lg">Delete Helicone Key</p>
            <p className="text-gray-700 w-[400px] whitespace-pre-wrap text-sm">
              This Helicone key will be deleted from your account. You will no
              longer be able to use this for the your API requests. Are you sure
              you want to delete this key permanently?
            </p>
            <div className="w-full flex justify-end gap-4 mt-4">
              <button
                onClick={() => {
                  setDeleteHeliconeOpen(false);
                }}
                className={clsx(
                  "relative inline-flex items-center rounded-md hover:bg-gray-50 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                )}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (user?.email === DEMO_EMAIL) {
                    setNotification("Demo key can not be deleted", "error");
                    return;
                  }

                  supabaseClient
                    .from("helicone_api_keys")
                    .delete()
                    .eq("api_key_hash", selectedHeliconeKey.api_key_hash)
                    .then((res) => {
                      setDeleteHeliconeOpen(false);
                      setNotification("Key successfully deleted", "success");
                      refetchHeliconeKeys();
                    });
                }}
                className={clsx(
                  "relative inline-flex items-center rounded-md hover:bg-red-700 bg-red-500 px-4 py-2 text-sm font-medium text-white"
                )}
              >
                Delete
              </button>
            </div>
          </div>
        </ThemedModal>
      )}

      {deleteOpen && selectedKey !== undefined && (
        <ThemedModal open={deleteOpen} setOpen={setDeleteOpen}>
          <div className="flex flex-col gap-4 w-full">
            <p className="font-bold text-lg">Delete API Key</p>
            <p className="text-gray-700 w-[400px] whitespace-pre-wrap text-sm">
              This API key will be deleted from your account. API requests
              already made with this key will still be stored on our servers. If
              you delete this key and re-add it later, the requests made with
              this key will become visible again.
            </p>
            <div className="w-full flex justify-end gap-4 mt-4">
              <button
                onClick={() => {
                  setDeleteOpen(false);
                }}
                className={clsx(
                  "relative inline-flex items-center rounded-md hover:bg-gray-50 bg-white px-4 py-2 text-sm font-medium text-gray-700"
                )}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (user?.email === DEMO_EMAIL) {
                    setNotification("Demo key can not be deleted", "error");
                    return;
                  }

                  deleteKey(selectedKey.api_key_hash);

                  if (error) {
                    setNotification("Error deleting key", "error");
                    return;
                  }

                  setNotification("Key successfully deleted", "success");
                  setDeleteOpen(false);
                }}
                className={clsx(
                  "relative inline-flex items-center rounded-md hover:bg-red-700 bg-red-500 px-4 py-2 text-sm font-medium text-white"
                )}
              >
                Delete
              </button>
            </div>
          </div>
        </ThemedModal>
      )}
    </>
  );
};

export default KeyPage;

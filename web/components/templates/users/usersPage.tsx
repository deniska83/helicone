import { Dialog } from "@headlessui/react";
import {
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { truncString } from "../../../lib/stringHelpers";
import { useUsers } from "../../../services/hooks/users";
import {
  filterListToTree,
  FilterNode,
  filterUIToFilterLeafs,
} from "../../../services/lib/filters/filterDefs";
import { UserRow } from "../../../services/lib/users";
import AuthHeader from "../../shared/authHeader";
import LoadingAnimation from "../../shared/loadingAnimation";
import useNotification from "../../shared/notification/useNotification";
import ThemedModal from "../../shared/themed/themedModal";
import ThemedTableV2, { Column } from "../../ThemedTableV2";
import ThemedTableHeader from "../../shared/themed/themedTableHeader";
import { userTableFilters } from "../../../services/lib/filters/frontendFilterDefs";
import { UIFilterRow } from "../../shared/themed/themedAdvancedFilters";

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface UsersPageProps {
  page: number;
  pageSize: number;
}

const UsersPage = (props: UsersPageProps) => {
  const { page, pageSize } = props;

  const [advancedFilters, setAdvancedFilters] = useState<UIFilterRow[]>([]);

  const { users, count, from, isLoading, to } = useUsers(
    page,
    pageSize,
    filterListToTree(
      filterUIToFilterLeafs(userTableFilters, advancedFilters),
      "and"
    )
  );
  const router = useRouter();

  const { setNotification } = useNotification();

  const [open, setOpen] = useState(true);
  const [index, setIndex] = useState<number>();
  const [selectedUser, setSelectedUser] = useState<UserRow>();

  const selectRowHandler = (row: UserRow, idx: number) => {
    setIndex(idx);
    setSelectedUser(row);
    setOpen(true);
  };

  const getUSDate = (value: string) => {
    const date = new Date(value);
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    return `${month} ${day}, ${date.toLocaleTimeString().slice(0, -6)} ${date
      .toLocaleTimeString()
      .slice(-2)}`;
  };

  const columns: Column[] = [
    {
      key: "user_id",
      active: true,
      label: "Id",
      type: "text",
      filter: true,
      minWidth: 170,
      format: (value: string) =>
        value ? truncString(value, 10) : "No user ID",
    },
    {
      key: "active_for",
      label: "Active For",
      active: true,
      filter: false,
      format: (value: string) => `${value} days`,
    },
    {
      key: "last_active",
      label: "Last Active",
      active: true,
      type: "timestamp",
      filter: true,
      minWidth: 170,
      format: (value: string) => getUSDate(value),
    },
    {
      key: "total_requests",
      label: "Requests",
      active: true,
      type: "number",
      filter: true,
      format: (value: string) => Number(value).toFixed(2),
    },
    {
      key: "average_requests_per_day_active",
      label: "Avg Reqs / Day",
      active: true,
      type: "number",
      filter: true,
      format: (value: string) => Number(value).toFixed(2),
    },
    {
      key: "average_tokens_per_request",
      label: "Avg Tokens / Req",
      active: true,
      type: "number",
      filter: true,
      format: (value: string) => Number(value).toFixed(2),
    },
    {
      key: "cost",
      active: true,
      label: "Total Cost (USD)",
      format: (value: any) => Number(value).toFixed(2),
    },
  ];

  async function downloadCSV() {
    try {
      const response = await fetch("/api/export/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: advancedFilters,
          offset: (page - 1) * pageSize,
          limit: 100000,
        }),
      });
      if (!response.ok) {
        throw new Error("An error occurred while downloading the CSV file");
      }

      const csvData = await response.text();
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "users.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Release the Blob URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <>
      <AuthHeader title={"Users"} />
      <div className="space-y-2">
        <ThemedTableHeader
          csvExport={{
            onClick: downloadCSV,
          }}
          isFetching={isLoading}
          advancedFilter={{
            filterMap: userTableFilters,
            onAdvancedFilter: setAdvancedFilters,
            filters: advancedFilters,
          }}
        />
        {isLoading || from === undefined || to === undefined ? (
          <LoadingAnimation title="Getting users" />
        ) : (
          <>
            <ThemedTableV2
              columns={columns}
              rows={users}
              page={page}
              from={from}
              to={to}
              count={count || 0}
              onSelectHandler={selectRowHandler}
            />
          </>
        )}
      </div>
      {open && selectedUser !== undefined && index !== undefined && (
        <ThemedModal open={open} setOpen={setOpen}>
          <div>
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
              <UserCircleIcon
                className="h-8 w-8 text-sky-600"
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <Dialog.Title
                as="h3"
                className="text-lg font-medium leading-6 text-gray-900"
              >
                User Information
              </Dialog.Title>
              <button
                type="button"
                tabIndex={-1}
                className="inline-flex w-full justify-center text-base font-medium text-gray-500 sm:text-sm items-center"
                onClick={() => {
                  setNotification("Copied to clipboard", "success");
                  navigator.clipboard.writeText(JSON.stringify(selectedUser));
                }}
              >
                Copy to clipboard
                <ClipboardDocumentIcon className="h-5 w-5 ml-1" />
              </button>
              <ul className="mt-4 space-y-2">
                <li className="w-full flex flex-row justify-between gap-4 text-sm">
                  <p>User Id:</p>
                  <p>{selectedUser.user_id}</p>
                </li>
                <li className="w-full flex flex-row justify-between gap-4 text-sm">
                  <p>Active For:</p>
                  <p className="max-w-xl whitespace-pre-wrap text-left">
                    {selectedUser.active_for} days
                  </p>
                </li>
                <li className="w-full flex flex-row justify-between gap-4 text-sm">
                  <p>Last Active:</p>
                  <p className="max-w-xl whitespace-pre-wrap text-left">
                    {selectedUser.last_active}
                  </p>
                </li>
                <li className="w-full flex flex-row justify-between gap-4 text-sm">
                  <p>Total Requests:</p>
                  <p>{selectedUser.total_requests}</p>
                </li>
                <li className="w-full flex flex-row justify-between gap-4 text-sm">
                  <p>Average Requests per day:</p>
                  <p>{selectedUser.average_requests_per_day_active}</p>
                </li>
                <li className="w-full flex flex-row justify-between gap-4 text-sm">
                  <p>Tokens per request:</p>
                  <p> {selectedUser.average_tokens_per_request}</p>
                </li>
                <li className="w-full flex flex-row justify-between gap-4 text-sm">
                  <p>Total Cost:</p>
                  <p className="italic">(coming soon)</p>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-5 sm:mt-6 w-full justify-between gap-4 flex flex-row">
            <button
              type="button"
              tabIndex={-1}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-sky-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 sm:text-sm"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </ThemedModal>
      )}
    </>
  );
};

export default UsersPage;

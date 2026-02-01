import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getEmailPreferencesFn,
  updateEmailPreferencesFn,
} from "~/fn/email-preferences";
import { getErrorMessage } from "~/utils/error";
import { authClient } from "~/lib/auth-client";
import type { EmailDigestFrequency } from "~/db/schema";

export function useEmailPreferences(enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    queryKey: ["email-preferences"],
    queryFn: () => getEmailPreferencesFn(),
    enabled: enabled && !!session?.user,
  });
}

export function useUpdateEmailPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (frequency: EmailDigestFrequency) =>
      updateEmailPreferencesFn({ data: { emailDigestFrequency: frequency } }),
    onSuccess: () => {
      toast.success("Email preferences updated", {
        description: "Your email digest settings have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["email-preferences"] });
    },
    onError: (error) => {
      toast.error("Failed to update email preferences", {
        description: getErrorMessage(error),
      });
    },
  });
}

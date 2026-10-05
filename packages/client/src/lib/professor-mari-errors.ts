import { getPrivilegedActionErrorMessage } from "./api-client";
import { formatGenerationParameterError } from "./generation-parameter-errors";
import { translate } from "../localization/i18n";

/**
 * The toast description for a failed Professor Mari request. Shared so every
 * surface that talks to her — the Work pane, the omnibar — fails with the same
 * words instead of each inventing its own.
 */
export function describeProfessorMariError(error: unknown) {
  const message = getPrivilegedActionErrorMessage(error, "").trim();
  if (message) {
    return translate("mari.errors.withDetails", {
      message: formatGenerationParameterError(message),
      defaultValue: "{{message}} This message stays open so you can take a screenshot.",
    });
  }
  return translate("mari.errors.beforeAnswer", {
    defaultValue:
      "The request failed before Professor Mari could answer. This message stays open so you can take a screenshot.",
  });
}

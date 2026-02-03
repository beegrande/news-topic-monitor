import { useState } from "react";
import {
  useApiKeyStatus,
  useSaveApiKey,
  useDeleteApiKey,
  useTestApiKey,
} from "~/hooks/useApiKeys";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Key,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export function ApiKeySettings() {
  const { data: status, isLoading } = useApiKeyStatus();
  const saveMutation = useSaveApiKey();
  const deleteMutation = useDeleteApiKey();
  const testMutation = useTestApiKey();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      saveMutation.mutate(apiKeyInput.trim(), {
        onSuccess: () => {
          setApiKeyInput("");
        },
      });
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        "Are you sure you want to delete your OpenAI API key? You will need to add a new key to continue fetching news."
      )
    ) {
      deleteMutation.mutate();
    }
  };

  const handleTest = () => {
    testMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-48" />
        </CardContent>
      </Card>
    );
  }

  const hasKey = status?.hasOpenAIKey ?? false;
  const updatedAt = status?.openAIKeyUpdatedAt
    ? new Date(status.openAIKeyUpdatedAt)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OpenAI API Key Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">OpenAI API Key</h3>
              <p className="text-sm text-muted-foreground">
                Required for fetching news articles using AI-powered web search.
              </p>
            </div>
            {hasKey ? (
              <span className="inline-flex items-center gap-1.5 text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full">
                <Check className="h-4 w-4" />
                Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 px-2.5 py-1 rounded-full">
                <X className="h-4 w-4" />
                Not configured
              </span>
            )}
          </div>

          {hasKey ? (
            <div className="space-y-4">
              {/* Key status info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    Active
                  </span>
                </div>
                {updatedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Last updated:</span>
                    <span>{updatedAt.toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Key
                </Button>
              </div>

              {/* Update key form */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Update your API key:
                </p>
                <form onSubmit={handleSave} className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="sk-..."
                      disabled={saveMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="submit"
                    disabled={!apiKeyInput.trim() || saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Update
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="openai-api-key"
                    type={showApiKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                    disabled={saveMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key is encrypted and stored securely.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={!apiKeyInput.trim() || saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Save API Key
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  asChild
                >
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground"
                  >
                    Get an API key
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import {
  useApiKeyStatus,
  useSaveApiKey,
  useDeleteApiKey,
  useTestApiKey,
  useSetNewsProvider,
} from "~/hooks/useApiKeys";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
import type { NewsProvider } from "~/db/schema";

interface ApiKeyInputProps {
  provider: NewsProvider;
  hasKey: boolean;
  updatedAt: Date | null;
  placeholder: string;
  getKeyUrl: string;
  getKeyText: string;
}

function ApiKeyInput({
  provider,
  hasKey,
  updatedAt,
  placeholder,
  getKeyUrl,
  getKeyText,
}: ApiKeyInputProps) {
  const saveMutation = useSaveApiKey();
  const deleteMutation = useDeleteApiKey();
  const testMutation = useTestApiKey();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const providerName = provider === "openai" ? "OpenAI" : "Anthropic";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      saveMutation.mutate(
        { provider, apiKey: apiKeyInput.trim() },
        {
          onSuccess: () => {
            setApiKeyInput("");
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete your ${providerName} API key? You will need to add a new key to continue fetching news with this provider.`
      )
    ) {
      deleteMutation.mutate(provider);
    }
  };

  const handleTest = () => {
    testMutation.mutate(provider);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{providerName} API Key</h3>
          <p className="text-sm text-muted-foreground">
            {provider === "openai"
              ? "Used for fetching news with OpenAI web search."
              : "Used for fetching news with Claude web search."}
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
                  placeholder={placeholder}
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
            <Label htmlFor={`${provider}-api-key`}>API Key</Label>
            <div className="relative">
              <Input
                id={`${provider}-api-key`}
                type={showApiKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={placeholder}
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
            <Button type="button" variant="link" size="sm" asChild>
              <a
                href={getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground"
              >
                {getKeyText}
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function ApiKeySettings() {
  const { data: status, isLoading } = useApiKeyStatus();
  const setProviderMutation = useSetNewsProvider();

  const handleProviderChange = (value: NewsProvider) => {
    setProviderMutation.mutate(value);
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
          <div className="h-10 bg-muted animate-pulse rounded w-48" />
        </CardContent>
      </Card>
    );
  }

  const hasOpenAIKey = status?.hasOpenAIKey ?? false;
  const openAIUpdatedAt = status?.openAIKeyUpdatedAt
    ? new Date(status.openAIKeyUpdatedAt)
    : null;
  const hasAnthropicKey = status?.hasAnthropicKey ?? false;
  const anthropicUpdatedAt = status?.anthropicKeyUpdatedAt
    ? new Date(status.anthropicKeyUpdatedAt)
    : null;
  const newsProvider = status?.newsProvider ?? "openai";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label htmlFor="news-provider">News Provider</Label>
          <Select
            value={newsProvider}
            onValueChange={handleProviderChange}
            disabled={setProviderMutation.isPending}
          >
            <SelectTrigger id="news-provider" className="w-full max-w-xs">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI (GPT-4o + Web Search)</SelectItem>
              <SelectItem value="anthropic">
                Anthropic (Claude + Web Search)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose which AI provider to use for fetching news articles.
          </p>
        </div>

        <div className="border-t pt-6" />

        {/* OpenAI API Key Section */}
        <ApiKeyInput
          provider="openai"
          hasKey={hasOpenAIKey}
          updatedAt={openAIUpdatedAt}
          placeholder="sk-..."
          getKeyUrl="https://platform.openai.com/api-keys"
          getKeyText="Get an API key"
        />

        <div className="border-t pt-6" />

        {/* Anthropic API Key Section */}
        <ApiKeyInput
          provider="anthropic"
          hasKey={hasAnthropicKey}
          updatedAt={anthropicUpdatedAt}
          placeholder="sk-ant-..."
          getKeyUrl="https://console.anthropic.com/settings/keys"
          getKeyText="Get an API key"
        />
      </CardContent>
    </Card>
  );
}

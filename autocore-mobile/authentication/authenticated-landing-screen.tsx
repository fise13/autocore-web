import { View } from 'react-native';

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';

import { useActiveCompanyName } from '@/hooks/use-active-company-name';

import { useAuth } from './auth-provider';

export function AuthenticatedLandingScreen({ inactive = false }: { inactive?: boolean }) {
  const { colors } = useTheme();
  const { profile, error, requiresCompanySelection, hasAccess, signOut } = useAuth();
  const { companyName } = useActiveCompanyName('Not found');
  const companyLabel = requiresCompanySelection ? 'Not selected' : companyName;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing[4], gap: spacing[4] }}>
      <View style={{ gap: spacing[1] }}>
        <Text variant="title">AutoCore Mobile</Text>
        <Text variant="body" color="muted">
          Base auth layer is ready. Uses the same Firebase project and RBAC model as the main app.
        </Text>
      </View>

      <Card>
        <CardHeader>
          <Badge variant="secondary">{profile?.role ?? 'employee'}</Badge>
          <CardTitle>{profile?.displayName ?? profile?.email ?? 'User'}</CardTitle>
          <CardDescription>{profile?.email ?? 'Email not found'}</CardDescription>
        </CardHeader>
        <CardContent style={{ gap: spacing[2] }}>
          <Text variant="body">
            Company: {companyLabel}
          </Text>
          <Text variant="body">
            Access status: {hasAccess ? 'Active' : inactive ? 'Employee deactivated' : 'Role or employee check needed'}
          </Text>
        </CardContent>
      </Card>

      {requiresCompanySelection ? (
        <Card>
          <CardHeader>
            <CardTitle>A company needs to be selected</CardTitle>
            <CardDescription>
              You're signed in, but your profile has no active company yet. Choose a workspace in settings or contact an administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!hasAccess ? (
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>
              {inactive
                ? 'Your access to the company has been disabled by an administrator. Contact the company owner to restore it.'
                : 'The employee record may be inactive or missing the needed permissions. Check the role in the company employees section.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>There's a problem with the profile</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Button variant="outline" size="lg" onPress={signOut}>
        Sign out
      </Button>
    </View>
  );
}

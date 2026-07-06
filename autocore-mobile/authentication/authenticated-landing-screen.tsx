import { View } from 'react-native';

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Text } from '@/components/ui';
import { useTheme } from '@/hooks';
import { spacing } from '@/theme';

import { useActiveCompanyName } from '@/hooks/use-active-company-name';

import { useAuth } from './auth-provider';

export function AuthenticatedLandingScreen({ inactive = false }: { inactive?: boolean }) {
  const { colors } = useTheme();
  const { profile, error, requiresCompanySelection, hasAccess, signOut } = useAuth();
  const { companyName } = useActiveCompanyName('Не найдена');
  const companyLabel = requiresCompanySelection ? 'Не выбрана' : companyName;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing[4], gap: spacing[4] }}>
      <View style={{ gap: spacing[1] }}>
        <Text variant="title">AutoCore Mobile</Text>
        <Text variant="body" color="muted">
          Базовый auth layer готов. Используется тот же Firebase project и RBAC-модель, что и в основном приложении.
        </Text>
      </View>

      <Card>
        <CardHeader>
          <Badge variant="secondary">{profile?.role ?? 'employee'}</Badge>
          <CardTitle>{profile?.displayName ?? profile?.email ?? 'Пользователь'}</CardTitle>
          <CardDescription>{profile?.email ?? 'Email не найден'}</CardDescription>
        </CardHeader>
        <CardContent style={{ gap: spacing[2] }}>
          <Text variant="body">
            Компания: {companyLabel}
          </Text>
          <Text variant="body">
            Статус доступа: {hasAccess ? 'Активен' : inactive ? 'Сотрудник деактивирован' : 'Нужна проверка роли или сотрудника'}
          </Text>
        </CardContent>
      </Card>

      {requiresCompanySelection ? (
        <Card>
          <CardHeader>
            <CardTitle>Нужно выбрать компанию</CardTitle>
            <CardDescription>
              Аккаунт вошёл успешно, но в профиле пока нет активной компании. Выберите рабочее пространство в настройках или обратитесь к администратору.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!hasAccess ? (
        <Card>
          <CardHeader>
            <CardTitle>Доступ ограничен</CardTitle>
            <CardDescription>
              {inactive
                ? 'Ваш доступ к компании отключён администратором. Обратитесь к владельцу компании для восстановления.'
                : 'Сотрудник может быть неактивен или ещё не получил нужные права. Проверьте роль в разделе сотрудников компании.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Есть проблема с профилем</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Button variant="outline" size="lg" onPress={signOut}>
        Выйти
      </Button>
    </View>
  );
}

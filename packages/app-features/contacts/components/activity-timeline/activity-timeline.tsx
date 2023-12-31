import * as React from 'react'
import { ActivityType } from '@app/graphql'
import { DateTime, RelativeTime } from '@app/i18n'
import {
  Box,
  ButtonGroup,
  forwardRef,
  HStack,
  Spacer,
  Text,
  TextProps,
  Tooltip,
  useClipboard,
} from '@chakra-ui/react'
import { EditorField } from '@app/features/core/components/editor/editor'
import { StatusBadge } from '@app/features/core/components/status-badge'
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineIcon,
  TimelineTrack,
  TimelineContent,
  TimelineDot,
  Toolbar,
  ToolbarButton,
  MotionBox,
  Command,
} from '@saas-ui/pro'
import {
  Card,
  CardBody,
  Form,
  FormLayout,
  Link,
  LinkProps,
  PersonaAvatar,
  SubmitButton,
  SubmitHandler,
  useSnackbar,
  User,
  OverflowMenu,
  MenuItem,
  useModals,
  UseFormReturn,
} from '@saas-ui/react'
import { FiPaperclip } from 'react-icons/fi'
import { AnimatePresence } from 'framer-motion'

type Activity<Type, TData extends object, TUser = Partial<User>> = {
  id: string
  user: TUser
  type: Type
  data: TData
  date: Date
}

type ActivityAction = Activity<ActivityType.Action, { action: string }>
type ActivityComment = Activity<ActivityType.Comment, { comment: string }>
type ActivityUpdate = Activity<
  ActivityType.Update,
  { field: string; oldValue?: string; value?: string }
>

export type Activities = Array<
  ActivityAction | ActivityComment | ActivityUpdate
>

export interface ActivityTimelineProps {
  activities: Activities
  currentUser: User
  onAddComment: SubmitHandler<Comment>
  onDeleteComment?(id: string | number): Promise<void>
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = (props) => {
  const { currentUser, activities, onAddComment, onDeleteComment } = props
  return (
    <Timeline>
      <AnimatePresence initial={false}>
        {activities?.map((activity) => {
          switch (activity.type) {
            case 'action':
              return <ActivityTimelineAction key={activity.id} {...activity} />
            case 'comment':
              return (
                <ActivityTimelineComment
                  key={activity.id}
                  {...activity}
                  onDelete={onDeleteComment}
                />
              )
            case 'update':
              return <ActivityTimelineUpdate key={activity.id} {...activity} />
          }
        })}

        <ActivityTimelineAddComment
          user={currentUser}
          onSubmit={onAddComment}
        />
      </AnimatePresence>
    </Timeline>
  )
}

interface ActivityTimelineItem {
  id?: string
  icon: React.ReactNode
  iconOffset?: string
  children: React.ReactNode
}

const ActivityTimelineItem: React.FC<ActivityTimelineItem> = (props) => {
  const { id, icon, iconOffset = '-2px', children } = props
  return (
    <TimelineItem
      as={MotionBox}
      id={id}
      minH="38px"
      overflow="hidden"
      initial={{ opacity: 0, height: 0, minHeight: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, minHeight: 0 }}
      role="group"
    >
      <TimelineSeparator>
        <TimelineTrack top="0" bottom="auto" />
        <TimelineIcon mt={iconOffset}>{icon}</TimelineIcon>
        <TimelineTrack />
      </TimelineSeparator>
      <TimelineContent>{children}</TimelineContent>
    </TimelineItem>
  )
}

interface ActivityTimelineDate {
  date: Date
}

const ActivityTimelineDate: React.FC<ActivityTimelineDate> = (props) => {
  return (
    <Tooltip label={<DateTime date={props.date} />}>
      <ActivityText>
        <RelativeTime date={props.date} />
      </ActivityText>
    </Tooltip>
  )
}

const ActivityText = forwardRef<TextProps, 'span'>((props, ref) => {
  return <Text ref={ref} as="span" color="muted" {...props} />
})

const ActivityLink: React.FC<LinkProps> = (props) => {
  const snackbar = useSnackbar()

  const { onCopy } = useClipboard(props.href || '')
  return (
    <Link
      {...props}
      onClick={() => {
        onCopy()
        snackbar.info('Link copied to clipboard')
      }}
    />
  )
}

const ActivityUser: React.FC<TextProps & { user: Partial<User> }> = (props) => {
  const { user, ...rest } = props
  return (
    <ActivityText fontWeight="medium" color="app-text" {...rest}>
      {user.name || user.email || user.id}
    </ActivityText>
  )
}

const ActivityTimelineAction: React.FC<ActivityAction> = (props) => {
  const { id, users, data, date } = props
  return (
    <ActivityTimelineItem
      id={`action-${id}`}
      icon={
        <PersonaAvatar
          src={user.avatar}
          name={user.name}
          size="2xs"
          presence={user.status}
        />
      }
    >
      <ActivityText>
        <ActivityUser user={users} /> created the contact.
      </ActivityText>{' '}
      <ActivityLink href={`#action-${id}`} color="muted">
        <ActivityTimelineDate date={date} />
      </ActivityLink>
    </ActivityTimelineItem>
  )
}

interface UpdateIconProps {
  field: string
  value?: string
}

const UpdateIcon: React.FC<UpdateIconProps> = (props) => {
  switch (props.field) {
    case 'status':
      return <StatusBadge color={props.value} />
    default:
      return <TimelineDot />
  }
}

const ActivityTimelineUpdate: React.FC<ActivityUpdate> = (props) => {
  const { id, users, data, date } = props

  return (
    <ActivityTimelineItem id={`update-${id}`} icon={<UpdateIcon {...data} />}>
      <ActivityText>
        <ActivityUser user={users} /> changed {data.field} to {data.value}
        {data.oldValue && ` from ${data.oldValue}`}.
      </ActivityText>{' '}
      <ActivityLink href={`#update-${id}`} color="muted">
        <ActivityTimelineDate date={date} />
      </ActivityLink>
    </ActivityTimelineItem>
  )
}

interface ActivityTimelineCommentProps extends ActivityComment {
  onDelete?(id: string | number): Promise<void>
}

const ActivityTimelineComment: React.FC<ActivityTimelineCommentProps> = (
  props,
) => {
  const { id, users, data, date, onDelete } = props
  const modals = useModals()

  return (
    <ActivityTimelineItem
      id={`comment-${id}`}
      iconOffset="2px"
      icon={
        <PersonaAvatar
          src={users.avatar}
          name={users.name}
          size="xs"
          presence={users.presence}
        />
      }
    >
      <Card mb="4">
        <CardBody py="2">
          <HStack mb="4">
            <ActivityUser user={users} />
            <ActivityLink href={`#action-${id}`} color="muted">
              <ActivityTimelineDate date={date} />
            </ActivityLink>
            <ButtonGroup
              position="absolute"
              top="2"
              right="2"
              opacity="0"
              transition="all .2s ease-in"
              _groupHover={{ opacity: 1 }}
            >
              <OverflowMenu size="xs">
                <MenuItem
                  onClick={() =>
                    modals.confirm({
                      title: 'Are you sure you want to delete this comment?',
                      body: 'This action cannot be undone.',
                      confirmProps: { colorScheme: 'red' },
                      onConfirm: () => onDelete?.(id),
                    })
                  }
                >
                  Delete
                </MenuItem>
              </OverflowMenu>
            </ButtonGroup>
          </HStack>

          <Box dangerouslySetInnerHTML={{ __html: data.comment }} />
        </CardBody>
      </Card>
    </ActivityTimelineItem>
  )
}

interface Comment {
  files?: FileList
  comment: string
}

interface ActivityTimelineAddCommentProps {
  onSubmit: SubmitHandler<Comment>
  user: User
}

const ActivityTimelineAddComment: React.FC<ActivityTimelineAddCommentProps> = (
  props,
) => {
  const { onSubmit, user } = props

  const formRef = React.useRef<UseFormReturn<Comment>>(null)
  const submitRef = React.useRef<HTMLButtonElement>(null)

  return (
    <TimelineItem minH="38px">
      <TimelineSeparator>
        <TimelineTrack top="0" bottom="auto" />
        <TimelineIcon mt="2px">
          <PersonaAvatar
            src={user.avatar}
            name={user.name}
            size="xs"
            presence={user.presence}
          />
        </TimelineIcon>
      </TimelineSeparator>
      <TimelineContent>
        <Card py="3" px="4">
          <Form
            ref={formRef}
            onSubmit={async (data) => {
              await onSubmit(data)

              formRef.current?.reset()
            }}
          >
            <FormLayout>
              <EditorField
                name="comment"
                border="0"
                padding="0"
                placeholder="Write your comment..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey) {
                    submitRef.current?.click()
                  }
                }}
              />
              <Toolbar>
                <ToolbarButton
                  icon={<FiPaperclip />}
                  color="muted"
                  label="Upload a file"
                />
                <Spacer />
                <Tooltip
                  label={
                    <>
                      Submit comment <Command>⌘ enter</Command>
                    </>
                  }
                >
                  <SubmitButton ref={submitRef}>Comment</SubmitButton>
                </Tooltip>
              </Toolbar>
            </FormLayout>
          </Form>
        </Card>
      </TimelineContent>
    </TimelineItem>
  )
}

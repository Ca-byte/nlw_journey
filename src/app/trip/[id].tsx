import dayjs from "dayjs"
import { router, useLocalSearchParams } from "expo-router"
import {
  CalendarRange,
  Calendar as IconCalendar,
  Info,
  Mail,
  MapPin,
  Settings2,
  User,
} from "lucide-react-native"
import { useEffect, useState } from "react"
import { Alert, Keyboard, Text, TouchableOpacity, View } from "react-native"
import { DateData } from "react-native-calendars"

import { colors } from "@/styles/colors"
import { DatesSelected, calendarUtils } from "@/utils/calendarUtils"


import { TripDetails, tripServer } from "@/server/trip-server"

import { Button } from "@/components/button"
import { Calendar } from "@/components/calendar"
import { Input } from "@/components/input"
import Loading from "@/components/loading"
import { Modal } from "@/components/modal"
import { participantsServer } from "@/server/participants-server"
import { tripStorage } from "@/storage/trip"
import { validateInput } from "@/utils/validateInput"
import { Activities } from "./activities"
import { Details } from "./details"

export type TripData = TripDetails & { when: string }

enum MODAL {
  NONE = 0,
  UPDATE_TRIP = 1,
  CALENDAR = 2,
  CONFIRM_ATTENDANCE = 3,
}

export default function Trip() {
  // LOADING
  const [isLoadingTrip, setIsLoadingTrip] = useState(true)
  const [isUpdatingTrip, setIsUpdatingTrip] = useState(false)
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false)

  // MODAL
  const [showModal, setShowModal] = useState(MODAL.NONE)

  // DATA
  const [tripDetails, setTripDetails] = useState({} as TripData)
  const [option, setOption] = useState<"activity" | "details">("activity")
  const [selectedDates, setSelectedDates] = useState({} as DatesSelected)
  const [destination, setDestination] = useState("")
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")

  const tripParams = useLocalSearchParams<{
    id: string
    participant?: string
  }>()

  async function getTripDetails() {
    try {
      setIsLoadingTrip(true)

      if (tripParams.participant) {
        setShowModal(MODAL.CONFIRM_ATTENDANCE)
      }

      if (!tripParams.id) {
        return router.back()
      }

      const trip = await tripServer.getById(tripParams.id)

      const maxLengthDestination = 14
      const destination =
        trip.destination.length > maxLengthDestination
          ? trip.destination.slice(0, maxLengthDestination) + "..."
          : trip.destination

      const starts_at = dayjs(trip.starts_at).format("DD")
      const ends_at = dayjs(trip.ends_at).format("DD")
      const month = dayjs(trip.starts_at).format("MMM")

      setDestination(trip.destination)

      setTripDetails({
        ...trip,
        when: `${destination} de ${starts_at} a ${ends_at} de ${month}.`,
      })
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoadingTrip(false)
    }
  }

  function handleSelectDate(selectedDay: DateData) {
    const dates = calendarUtils.orderStartsAtAndEndsAt({
      startsAt: selectedDates.startsAt,
      endsAt: selectedDates.endsAt,
      selectedDay,
    })

    setSelectedDates(dates)
  }

  async function handleUpdateTrip() {
    try {
      if (!tripParams.id) {
        return
      }

      if (!destination || !selectedDates.startsAt || !selectedDates.endsAt) {
        return Alert.alert(
          "Update Trip",
  				"Remember to not only fill in the destination but also select the start and end dates of the trip."
        )
      }

      setIsUpdatingTrip(true)

      await tripServer.update({
        id: tripParams.id,
        destination,
        starts_at: dayjs(selectedDates.startsAt.dateString).toString(),
        ends_at: dayjs(selectedDates.endsAt.dateString).toString(),
      })

      Alert.alert("Update Trip","Trip updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            setShowModal(MODAL.NONE)
            getTripDetails()
          },
        },
      ])
    } catch (error) {
      console.log(error)
    } finally {
      setIsUpdatingTrip(false)
    }
  }

  async function handleConfirmAttendance() {
    try {
      if (!tripParams.id || !tripParams.participant) {
        return
      }

      if (!guestName.trim() || !guestEmail.trim()) {
        return Alert.alert(
          "Confirmation",
  				"Fill in your name and email to confirm the trip!"
        )
      }

      if (!validateInput.email(guestEmail.trim())) {
        return Alert.alert("Confirmation","Invalid email!")
      }

      setIsConfirmingAttendance(true)

      await participantsServer.confirmTripByParticipantId({
        participantId: tripParams.participant,
        name: guestName,
        email: guestEmail.trim(),
      })

      Alert.alert("Confirmation","Trip confirmed successfully!")

      await tripStorage.save(tripParams.id)

      setShowModal(MODAL.NONE)
    } catch (error) {
      console.log(error)
      Alert.alert("Confirmation","Could not confirm!")
    } finally {
      setIsConfirmingAttendance(false)
    }
  }

  async function handleRemoveTrip() {
    try {
      Alert.alert("Remove Trip","Are you sure you want to remove the trip?", [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            await tripStorage.remove()
            router.navigate("/")
          },
        },
      ])
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getTripDetails()
  }, [])

  if (isLoadingTrip) {
    return <Loading />
  }

  return (
    <View className="flex-1 px-5 pt-16">
      <Input variant="tertiary">
        <MapPin color={colors.zinc[400]} size={20} />
        <Input.Field value={tripDetails.when} readOnly />

        <TouchableOpacity
          activeOpacity={0.6}
          className="w-9 h-9 bg-zinc-800 items-center justify-center rounded"
          onPress={() => setShowModal(MODAL.UPDATE_TRIP)}
        >
          <Settings2 color={colors.zinc[400]} size={20} />
        </TouchableOpacity>
      </Input>

      {option === "activity" ? (
        <Activities tripDetails={tripDetails} />
      ) : (
        <Details tripId={tripDetails.id} />
      )}

      <View className="w-full absolute -bottom-1 self-center justify-end pb-5 z-10 bg-zinc-950">
        <View className="w-full flex-row bg-zinc-900 p-4 rounded-lg border border-zinc-800 gap-2">
          <Button
            className="flex-1"
            onPress={() => setOption("activity")}
            variant={option === "activity" ? "primary" : "secondary"}
          >
            <CalendarRange
              color={
                option === "activity" ? colors.lime[950] : colors.zinc[200]
              }
              size={20}
            />
            <Button.Title>Activities</Button.Title>
          </Button>

          <Button
            className="flex-1"
            onPress={() => setOption("details")}
            variant={option === "details" ? "primary" : "secondary"}
          >
            <Info
              color={option === "details" ? colors.lime[950] : colors.zinc[200]}
              size={20}
            />
            <Button.Title>Details</Button.Title>
          </Button>
        </View>
      </View>

      <Modal
        title="Update Trip"
        subtitle="Only the creator of the trip can edit."
        visible={showModal === MODAL.UPDATE_TRIP}
        onClose={() => setShowModal(MODAL.NONE)}
      >
        <View className="gap-2 my-4">
          <Input variant="secondary" className="flex-1">
            <MapPin color={colors.zinc[400]} size={20} />
            <Input.Field
              placeholder="Where to?"
              onChangeText={setDestination}
              value={destination}
            />
          </Input>

          <Input variant="secondary" className="flex-1">
            <IconCalendar color={colors.zinc[400]} size={20} />

            <Input.Field
              placeholder="When?"
              value={selectedDates.formatDatesInText}
              onPressIn={() => setShowModal(MODAL.CALENDAR)}
              onFocus={() => Keyboard.dismiss()}
            />
          </Input>
        </View>

        <Button onPress={handleUpdateTrip} isLoading={isUpdatingTrip}>
          <Button.Title>Update</Button.Title>
        </Button>

        <TouchableOpacity activeOpacity={0.8} onPress={handleRemoveTrip}>
          <Text className="text-red-400 text-center mt-6">Remove Trip</Text>
        </TouchableOpacity>
      </Modal>

      <Modal
        title="Select Dates"
        subtitle="Select the departure and return dates of the trip"
        visible={showModal === MODAL.CALENDAR}
        onClose={() => setShowModal(MODAL.NONE)}
      >
        <View className="gap-4 mt-4">
          <Calendar
            minDate={dayjs().toISOString()}
            onDayPress={handleSelectDate}
            markedDates={selectedDates.dates}
          />

          <Button onPress={() => setShowModal(MODAL.UPDATE_TRIP)}>
            <Button.Title>Confirm</Button.Title>
          </Button>
        </View>
      </Modal>

      <Modal
        title="Confirm presense"
        visible={showModal === MODAL.CONFIRM_ATTENDANCE}
      >
        <View className="gap-4 mt-4">
          <Text className="text-zinc-400 font-regular leading-6 my-2">
						You have been invited to join a trip to
            <Text className="font-semibold text-zinc-100">
              {" "}
              {tripDetails.destination}{" "}
            </Text>
            on the dates of{" "}
            <Text className="font-semibold text-zinc-100">
              {dayjs(tripDetails.starts_at).date()} a{" "}
              {dayjs(tripDetails.ends_at).date()} de{" "}
              {dayjs(tripDetails.ends_at).format("MMMM")}. {"\n\n"}
            </Text>
              To confirm your presence on the trip, please fill in the details below:
          </Text>

          <Input variant="secondary">
            <User color={colors.zinc[400]} size={20} />
            <Input.Field
              placeholder="Full name"
              onChangeText={setGuestName}
            />
          </Input>

          <Input variant="secondary">
            <Mail color={colors.zinc[400]} size={20} />
            <Input.Field
              placeholder="Confirmation email"
              onChangeText={setGuestEmail}
            />
          </Input>

          <Button
            isLoading={isConfirmingAttendance}
            onPress={handleConfirmAttendance}
          >
            <Button.Title>Confirm my presence</Button.Title>
          </Button>
        </View>
      </Modal>
    </View>
  )
}
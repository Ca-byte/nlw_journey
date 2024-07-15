import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { GuestEmail } from "@/components/email";
import { Input } from "@/components/input";
import Loading from "@/components/loading";
import { Modal } from "@/components/modal";
import { tripServer } from "@/server/trip-server";
import { tripStorage } from "@/storage/trip";
import { colors } from "@/styles/colors";
import { calendarUtils, DatesSelected } from "@/utils/calendarUtils";
import { validateInput } from "@/utils/validateInput";
import dayjs from "dayjs";
import { router } from "expo-router";
import { ArrowRight, AtSign, Calendar as IconCalendar, MapPin, Settings2, UserRoundPlus } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Image, Keyboard, Text, View } from "react-native";
import { DateData } from "react-native-calendars";

enum StepForm {
	TRIP_DETAILS = 1,
	ADD_EMAIL = 2
}

enum MODAL {
  NONE = 0,
  CALENDAR = 1,
  GUESTS = 2,
}

export default function Index(){

	 // LOADING
	 const [isCreatingTrip, setIsCreatingTrip] = useState(false)
	 const [isGettingTrip, setIsGettingTrip] = useState(true)

	//DATA
	const [stepForm, setStepForm]= useState(StepForm.TRIP_DETAILS)
	const [selectedDates, setSelectedDates] = useState({} as DatesSelected)
	const [destination, setDestination] = useState("")
  const [emailToInvite, setEmailToInvite] = useState("")
  const [emailsToInvite, setEmailsToInvite] = useState<string[]>([])


	 // MODAL
	 const [showModal, setShowModal] = useState(MODAL.NONE)

	function handleNextStepForm(){
		if (
      destination.trim().length === 0 ||
      !selectedDates.startsAt ||
      !selectedDates.endsAt
    ) {
      return Alert.alert(
        "Trip Details",
				"Fill in all the trip information to proceed."
      )
    }

    if (destination.length < 4) {
      return Alert.alert(
        "Trip Details",
				"The destination must be at least 4 characters long."			
      )
    }

		if(stepForm === StepForm.TRIP_DETAILS){
			return setStepForm(StepForm.ADD_EMAIL)
		}

		Alert.alert( "New Trip","Confirm trip?", [
      {
        text: "No",
        style: "cancel",
      },
      {
        text: "Yes",
        onPress: createTrip,
      },
    ])
	}


	function handleSelectDate(selectedDay: DateData) {
    const dates = calendarUtils.orderStartsAtAndEndsAt({
      startsAt: selectedDates.startsAt,
      endsAt: selectedDates.endsAt,
      selectedDay,
    })

    setSelectedDates(dates)
  }

	function handleRemoveEmail(emailToRemove: string) {
    setEmailsToInvite((prevState) =>
      prevState.filter((email) => email !== emailToRemove)
    )
  }

	function handleAddEmail() {
    if (!validateInput.email(emailToInvite)) {
      return Alert.alert("Guest","Invalid email!")
    }

    const emailAlreadyExists = emailsToInvite.find(
      (email) => email === emailToInvite
    )

    if (emailAlreadyExists) {
      return Alert.alert("Guest","Email has already been added!")
    }

    setEmailsToInvite((prevState) => [...prevState, emailToInvite])
    setEmailToInvite("")
  }

	async function saveTrip(tripId: string) {
    try {
      await tripStorage.save(tripId)
      router.navigate("/trip/" + tripId)
    } catch (error) {
      Alert.alert(
        "Save Trip",
  			"Could not save the trip ID on the device."
      )
      console.log(error)
    }
  }

  async function createTrip() {
    try {
      setIsCreatingTrip(true)

      const newTrip = await tripServer.create({
        destination,
        starts_at: dayjs(selectedDates.startsAt?.dateString).toString(),
        ends_at: dayjs(selectedDates.endsAt?.dateString).toString(),
        emails_to_invite: emailsToInvite,
      })

      Alert.alert("New Trip","Trip created successfully!", [
        {
          text: "OK. Continue.",
          onPress: () => saveTrip(newTrip.tripId),
        },
      ])
    } catch (error) {
      console.log(error)
      setIsCreatingTrip(false)
    }
  }
	async function getTrip() {
    try {
      const tripID = await tripStorage.get()

      if (!tripID) {
        return setIsGettingTrip(false)
      }

      const trip = await tripServer.getById(tripID)

      if (trip) {
        return router.navigate("/trip/" + trip.id)
      }
    } catch (error) {
      setIsGettingTrip(false)
      console.log(error)
    }
  }

  useEffect(() => {
    getTrip()
  }, [])

  if (isGettingTrip) {
    return <Loading />
  }

	return(
		<View className="flex-1 justify-center items-center px-5 gap-6">
			<Image 
				source={require("@/assets/logo.png")}
				className="h-8"
			/>

			<Image 
				source={require("@/assets/bg.png")}
				className="absolute"
				resizeMode="contain"
			/>
			<Text className="text-zinc-400 font-regular text-center text-lg mt-3">
				Invite your friends and plan{"\n"}your next trip!
			</Text>

			<View className="w-full bg-zinc-900 p-4 rounded-xl my-8 border border-zinc-800">

				<Input>
					<MapPin color={colors.zinc[400]} size={20} />
					<Input.Field 
						placeholder="Where we go?" 
						editable={stepForm === StepForm.TRIP_DETAILS} 
						onChangeText={setDestination}
						value={destination}
					/>
				</Input>

				<Input>
					<IconCalendar color={colors.zinc[400]} size={20} />
					<Input.Field 
						placeholder="When?" 
						editable={stepForm === StepForm.TRIP_DETAILS}
						onFocus={() => Keyboard.dismiss()}
            showSoftInputOnFocus={false}
						onPressIn={() =>
              stepForm === StepForm.TRIP_DETAILS && setShowModal(MODAL.CALENDAR)
            }
						value={selectedDates.formatDatesInText}
						/>
				</Input>
				{stepForm === StepForm.ADD_EMAIL && (
					<>
					<View className="border-b border-zinc-800 py-6">
						<Button variant="secondary" onPress={()=>setStepForm(StepForm.TRIP_DETAILS)}>
							<Button.Title>Change location/date</Button.Title>
							<Settings2 className={colors.zinc[200]} size={20} />
						</Button>
					</View>

					<Input>
						<UserRoundPlus color={colors.zinc[400]} size={20} />
						<Input.Field placeholder="Who will be on the trip?" 
              autoCorrect={false}
                value={
                  emailsToInvite.length > 0
                    ? `${emailsToInvite.length} guest(s) invited`
                    : ""
                }
              onPress={() => {
                Keyboard.dismiss()
                setShowModal(MODAL.GUESTS)
              }}
              showSoftInputOnFocus={false}
            />
          </Input>
        </>
      )}

				<Button onPress={handleNextStepForm} isLoading={isCreatingTrip}>
					<Button.Title>
						{ stepForm === StepForm.TRIP_DETAILS 
            ? "Continue" 
            : " Confirm Trip"
						}
						</Button.Title>
					<ArrowRight className={colors.lime[950]} size={20} />
				</Button>
			</View>

			<Text className="text-zinc-500 font-regular text-center text-base py-2">
				By planning your trip with plann.er, you automatically agree to our{" "} 
				<Text className="text-zinc-300 underline">
					terms of use and privacy policies.
				</Text>
			</Text>
			<Modal
				title="Select guests"
				subtitle="Guests will receive emails to confirm their participation in the trip."
				visible={showModal === MODAL.CALENDAR}
        onClose={() => setShowModal(MODAL.NONE)}
			>
				 <View className="gap-4 mt-4">
          <Calendar
            minDate={dayjs().toISOString()}
            onDayPress={handleSelectDate}
            markedDates={selectedDates.dates}
          />

          <Button onPress={() => setShowModal(MODAL.NONE)}>
            <Button.Title>Confirm</Button.Title>
          </Button>
        </View>
			</Modal>
			
			<Modal
        title="Select Guests"
        subtitle="Guests will receive emails to confirm their participation in the trip."
        visible={showModal === MODAL.GUESTS}
        onClose={() => setShowModal(MODAL.NONE)}
      >
        <View className="my-2 flex-wrap gap-2 border-b border-zinc-800 py-5 items-start">
          {emailsToInvite.length > 0 ? (
            emailsToInvite.map((email) => (
              <GuestEmail
                key={email}
                email={email}
                onRemove={() => handleRemoveEmail(email)}
              />
            ))
          ) : (
            <Text className="text-zinc-600 text-base font-regular">
             No email added.
            </Text>
          )}
        </View>

        <View className="gap-4 mt-4">
          <Input variant="secondary">
            <AtSign color={colors.zinc[400]} size={20} />
            <Input.Field
              placeholder="Enter guest's email"
              keyboardType="email-address"
              onChangeText={(text) => setEmailToInvite(text.toLowerCase())}
              value={emailToInvite}
              returnKeyType="send"
              onSubmitEditing={handleAddEmail}
            />
          </Input>

          <Button onPress={handleAddEmail}>
            <Button.Title>Invite</Button.Title>
          </Button>
        </View>
      </Modal>
		</View>
	)
}
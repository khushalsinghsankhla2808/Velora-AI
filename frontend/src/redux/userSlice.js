import { createSlice } from '@reduxjs/toolkit'

const userSlice = createSlice({
  name: 'user',

  initialState: {
    userData: null
  },

  reducers: {
    setUserData: (state, action) => {
      if (action.payload) {
        state.userData = {
          ...action.payload,
          token: action.payload.token || state.userData?.token
        };
      } else {
        state.userData = null;
      }
    },

    removeUserData: (state) => {
      state.userData = null;
    }
  },
})

// export actions
export const { setUserData, removeUserData } = userSlice.actions

// export reducer
export default userSlice.reducer